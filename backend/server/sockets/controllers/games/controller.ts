import assert from 'assert';
import socketIo from 'socket.io';
import _ from 'lodash';

import {
  PlayerJWT,
  InternalPlayer,
  MessagePickCards,
  MessageRevealSubmission,
  MessageChooseWinner,
  GameStatus,
  InternalGameState,
  Round,
  RoundStatus,
  UUID,
  GameState,
  Player,
  MessageRoundUpdated,
  RoundTimeoutKeys,
} from '../../../../root-types';
import L from '../../../common/logger';
import DBService from '../../../services/db.service';
import GameService from '../../../services/game.service';

export type JwtAuthenticatedSocket = SocketIO.Socket & {
  decoded_token: PlayerJWT;
};

const updateRound = async (
  gameId: string,
  roundIndex: number,
  updateFn: (
    round: Round,
    gameState: InternalGameState
  ) => Promise<{ round?: Partial<Round>; gameState?: Partial<InternalGameState> }>
): Promise<void> => {
  await DBService.updateGame(gameId, async (gameState) => {
    assert(gameState.game.status === GameStatus.Running, 'Only running games can be updated.');
    assert(roundIndex === gameState.rounds.length - 1, 'Only the last round can be updated.');
    const round = gameState.rounds[roundIndex];
    assert(round, 'Invalid round.');
    assert(round.status !== RoundStatus.Ended, 'Round already ended.');

    const { round: newRound, gameState: newGameState } = await updateFn(round, gameState);
    const result: InternalGameState = _.merge(gameState, newGameState);
    result.rounds[roundIndex] = _.merge(result.rounds[roundIndex], newRound);
    return result;
  });
};

export default class Controller {
  playerId: string;
  gameId: string;
  io: socketIo.Server;
  socket: JwtAuthenticatedSocket;
  timeouts: Partial<Record<RoundTimeoutKeys, NodeJS.Timeout>>[];

  constructor(io: socketIo.Server, socket: JwtAuthenticatedSocket) {
    const { id: playerId, gameId } = socket.decoded_token;
    this.io = io;
    this.socket = socket;
    this.playerId = playerId;
    this.gameId = gameId;
    this.timeouts = [];
  }

  static getRoomName(gameId: string): string {
    return `game:${gameId}`;
  }

  static async validateJwt(
    decoded: PlayerJWT,
    onSuccess: Function,
    onError: Function
  ): Promise<unknown> {
    const { id: playerId, gameId } = decoded;
    L.info(`Player ${playerId} wants to connect to game ${gameId}.`);

    try {
      const gameState = await DBService.getGame(gameId);
      assert(gameState.players.some((el) => el.id === playerId));
      assert(GameService.isGameJoinable(gameState.game), 'Game not joinable.');
    } catch (error) {
      return onError(error.message);
    }

    if (await DBService.setUserLock(playerId, true)) {
      return onSuccess();
    }

    L.warn(`Player ${playerId} is already locked.`);
    return onError('user-locked');
  }

  static async onDisconnect(socket: JwtAuthenticatedSocket): Promise<void> {
    if (!socket.decoded_token) return;
    const { id: playerId, gameId } = socket.decoded_token;

    await DBService.updateGame(gameId, async (fullGameState) => {
      return GameService.updatePlayer(fullGameState, playerId, {
        isActive: false,
        socketId: undefined,
      });
    });

    await this.sendUpdated(socket, gameId, ['gamestate']);
    await DBService.deleteUserLock(playerId);
  }

  static async sendUpdated(
    io: socketIo.Server | socketIo.Socket,
    gameId: string,
    information: Array<'gamestate' | 'player' | 'round'>
  ): Promise<void> {
    const gameState = await DBService.getGame(gameId);

    if (information.includes('gamestate')) {
      const msgGamestate: GameState = GameService.stripGameState(gameState);
      io.to(this.getRoomName(gameId)).emit('gamestate_updated', msgGamestate);
      L.info('Game %s - send updated GameState %o', gameId, msgGamestate);
    }

    if (information.includes('round')) {
      const roundIndex: number = gameState.rounds.length - 1;
      const msgRound: MessageRoundUpdated = {
        roundIndex,
        round: GameService.stripRound(gameState.rounds[roundIndex]),
      };
      io.to(this.getRoomName(gameId)).emit('round_updated', msgRound);
      L.info('Game %s - send updated round %o', gameId, msgRound);
    }

    if (information.includes('player')) {
      gameState.players
        .filter((player) => player.isActive)
        .forEach((player: InternalPlayer) => {
          const msgPlayer: Player = _.omit(player, ['socketId']);
          io.to(player.socketId).emit('player_updated', msgPlayer);
          L.info('Game %s - Player %s - send updated player %o', gameId, player.id, msgPlayer);
        });
    }
  }

  // Other actions

  setRoundPlayed = async (roundIndex: number): Promise<void> => {
    this.clearTimeouts(roundIndex);
    await updateRound(this.gameId, roundIndex, async (_prevRound, prevGameState) => {
      const gameState = GameService.playRound(prevGameState, roundIndex);
      this.addTimeoutHandler(gameState, 'revealing');
      return { gameState };
    });
    await Controller.sendUpdated(this.io, this.gameId, ['round', 'player']);
  };

  setRoundRevealed = async (roundIndex: number): Promise<void> => {
    this.clearTimeouts(roundIndex);
    await updateRound(this.gameId, roundIndex, async (_prevRound, prevGameState) => {
      const gameState = GameService.revealRound(prevGameState, roundIndex);
      this.addTimeoutHandler(gameState, 'judging');
      return { gameState };
    });
    await Controller.sendUpdated(this.io, this.gameId, ['round']);
  };

  setRoundEnded = async (roundIndex: number): Promise<void> => {
    this.clearTimeouts(roundIndex);
    let gameShouldEnd = false;
    await updateRound(this.gameId, roundIndex, async (_round, prevGameState) => {
      const gameState = GameService.endRound(prevGameState, roundIndex);

      gameShouldEnd =
        !!gameState.game.winnerPoints &&
        gameState.players.some((p) => p.points >= gameState.game.winnerPoints);

      if (gameShouldEnd) {
        gameState.rounds[roundIndex].timeouts = _.omit(
          gameState.rounds[roundIndex].timeouts,
          'betweenRounds'
        );
      } else {
        this.addTimeoutHandler(gameState, 'betweenRounds');
      }
      return { gameState };
    });

    if (gameShouldEnd) {
      this.setGameEnded();
    } else {
      await Controller.sendUpdated(this.io, this.gameId, ['gamestate', 'player']);
    }
  };

  setGameEnded = async (): Promise<void> => {
    await DBService.updateGame(this.gameId, async (fullGameState) => {
      assert(fullGameState.game.status !== GameStatus.Ended, 'Game is already ended.');
      return GameService.endGame(fullGameState);
    });

    await Controller.sendUpdated(this.io, this.gameId, ['gamestate']);
  };

  // Timeout handlers

  addTimeoutHandler = (fullGameState: InternalGameState, eventName: RoundTimeoutKeys): void => {
    const roundIdx = fullGameState.rounds.length - 1;
    assert(roundIdx >= 0, 'No round found.');
    const timeoutMs =
      ((fullGameState.rounds[roundIdx].timeouts[eventName] as Date)?.getTime() || 0) - _.now();
    assert(timeoutMs > 0, 'No timeout to set.');

    const logPrefix = `Game ${this.gameId} - Player ${this.playerId} - Timeout ${eventName} at round ${roundIdx}`;
    L.info('%s - remaining: %d ms.', logPrefix, timeoutMs);

    const handlerFns: Record<RoundTimeoutKeys, Function> = {
      playing: this.setRoundPlayed,
      revealing: this.setRoundRevealed,
      judging: this.setRoundEnded,
      betweenRounds: this.onStartNextRound,
    };
    const handlerFn = handlerFns[eventName];
    assert(handlerFn, 'No valid event submitted.');

    const timeout: NodeJS.Timeout = setTimeout(async () => {
      try {
        L.info('%s - Fired!', logPrefix);
        await handlerFn(roundIdx);
      } catch (error) {
        // We expect errors here, as the timeouts might be set from different players.
        L.warn('%s - ERROR: %o', logPrefix, error);
      }
    }, timeoutMs);

    _.set(this.timeouts, [roundIdx, eventName], timeout);
  };

  clearTimeouts = (roundIdx: number): void => {
    _.forEach(this.timeouts[roundIdx], (value, key) => {
      if (value === undefined) return;
      clearTimeout(value);
      L.debug(
        'Game %s - Player %s - Resetting timeout handler %s for round %d',
        this.gameId,
        this.playerId,
        key,
        roundIdx
      );

      // eslint-disable-next-line no-param-reassign
      value = undefined;
    });
  };

  // Event handlers

  onJoinGame = async (): Promise<void> => {
    await DBService.updateGame(this.gameId, async (fullGameState) => {
      let gameState = GameService.updatePlayer(fullGameState, this.playerId, {
        isActive: true,
        socketId: this.socket.id,
      });

      // If the game is running, we need to make sure the player has a full hand
      if (GameService.isGameRunning(gameState.game)) {
        gameState = GameService.refillHandForPlayers(gameState, [{ id: this.playerId }]);
      }

      return gameState;
    });

    await Controller.sendUpdated(this.io, this.gameId, ['gamestate']);
  };

  onStartGame = async (): Promise<void> => {
    L.info('Game %s – Player %s – Received event onStartGame.', this.gameId, this.playerId);
    await DBService.updateGame(this.gameId, async (fullGameState) => {
      assert(GameService.isHost(fullGameState, this.playerId), 'Only a host can start a game.');
      const gameState = GameService.startGame(fullGameState);
      this.addTimeoutHandler(gameState, 'playing');
      return gameState;
    });

    await Controller.sendUpdated(this.io, this.gameId, ['gamestate', 'player']);
  };

  onStartNextRound = async (previosRoundIdx = 0): Promise<void> => {
    L.info('Game %s – Player %s – Received event onStartNextRound.', this.gameId, this.playerId);
    this.clearTimeouts(previosRoundIdx);
    await DBService.updateGame(this.gameId, async (fullGameState) => {
      assert(GameService.isGameRunning(fullGameState.game), 'Only running games can be updated.');
      const gameState = GameService.newRound(fullGameState);
      this.addTimeoutHandler(gameState, 'playing');
      return gameState;
    });
    await Controller.sendUpdated(this.io, this.gameId, ['gamestate', 'player']);
  };

  onPickCards = async (data: MessagePickCards): Promise<void> => {
    L.info(
      'Game %s – Player %s – Received event onPickCards: %o.',
      this.gameId,
      this.playerId,
      data
    );
    const { roundIndex, cards: pickedCards } = data;
    let pickComplete = false;
    await updateRound(this.gameId, roundIndex, async (_round, prevGameState) => {
      const gameState = GameService.pickCards(
        prevGameState,
        roundIndex,
        this.playerId as UUID,
        pickedCards
      );

      pickComplete =
        gameState.rounds[roundIndex].submissions.length >=
        gameState.players.filter((p) => p.isActive).length - 1;

      return { gameState };
    });

    if (pickComplete) {
      this.setRoundPlayed(roundIndex);
    } else {
      await Controller.sendUpdated(this.io, this.gameId, ['round', 'player']);
    }
  };

  onRevealSubmission = async (data: MessageRevealSubmission): Promise<void> => {
    L.info(
      'Game %s – Player %s – Received event onRevealSubmission: %o.',
      this.gameId,
      this.playerId,
      data
    );
    const { roundIndex, submissionIndex } = data;
    let revealComplete = false;
    await updateRound(this.gameId, roundIndex, async (prevRound) => {
      assert(prevRound.judgeId === this.playerId, 'Only judge can reveal.');
      const round = GameService.revealSubmission(prevRound, submissionIndex);
      revealComplete = round.submissions.every((s) => s.isRevealed);
      return { round };
    });

    if (revealComplete) {
      this.setRoundRevealed(roundIndex);
    } else {
      await Controller.sendUpdated(this.io, this.gameId, ['round']);
    }
  };

  onChooseWinner = async (data: MessageChooseWinner): Promise<void> => {
    L.info(
      'Game %s – Player %s – Received event onChooseWinner: %o.',
      this.gameId,
      this.playerId,
      data
    );
    const { roundIndex, submissionIndex } = data;
    await updateRound(this.gameId, roundIndex, async (round) => {
      assert(round.judgeId === this.playerId, 'Only the judge can choose a winner.');
      return { round: GameService.chooseWinner(round, submissionIndex) };
    });
    this.setRoundEnded(roundIndex);
  };

  onEndGame = async (): Promise<void> => {
    L.info('Game %s – Player %s – Received event onEndGame.', this.gameId, this.playerId);
    const gameState = await DBService.getGame(this.gameId);
    assert(GameService.isHost(gameState, this.playerId), 'Only a host can end a game.');
    this.setGameEnded();
  };
}
