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
  MessageDiscardPrompt,
} from '../../../../root-types';
import L from '../../../common/logger';
import DBService from '../../../services/db.service';
import GameService from '../../../services/game.service';

// eslint-disable-next-line import/no-cycle
import queue from './queue';

export type JwtAuthenticatedSocket = SocketIO.Socket & {
  decoded_token: PlayerJWT;
};

const updateRound = async (
  gameId: string,
  roundIndex: number,
  updateFn: (
    round: Round,
    gameState: InternalGameState
  ) => Promise<{ round?: Round; gameState?: InternalGameState }>
): Promise<void> => {
  await DBService.updateGame(gameId, async (gameState) => {
    assert(gameState.game.status === GameStatus.Running, 'Only running games can be updated.');
    assert(roundIndex === gameState.rounds.length - 1, 'Only the last round can be updated.');
    const round = gameState.rounds[roundIndex];
    assert(round, 'Invalid round.');
    assert(round.status !== RoundStatus.Ended, 'Round already ended.');

    const { round: newRound, gameState: newGameState } = await updateFn(round, gameState);

    const result: InternalGameState = newGameState || gameState;
    if (newRound) result.rounds[roundIndex] = newRound;
    return result;
  });
};

export default class Controller {
  playerId: UUID;

  gameId: UUID;

  io: socketIo.Server;

  constructor(io: socketIo.Server, gameId: UUID, playerId: UUID) {
    this.io = io;
    this.playerId = playerId;
    this.gameId = gameId;
  }

  static getRoomName(gameId: UUID): string {
    return `game:${gameId}`;
  }

  static async validateJwt(
    decoded: PlayerJWT,
    onSuccess: () => void,
    onError: (err: string, code: string) => void
  ): Promise<unknown> {
    const { id: playerId, gameId } = decoded;
    L.info(`Player ${playerId} wants to connect to game ${gameId}.`);

    try {
      const gameState = await DBService.getGame(gameId);
      assert(gameState.players.some((el) => el.id === playerId));
    } catch (error) {
      return onError(error.message, 'unkown');
    }

    if (await DBService.setUserLock(playerId, true)) {
      return onSuccess();
    }

    L.warn(`Player ${playerId} is already locked.`);
    return onError('user-locked', 'user-locked');
  }

  static async onDisconnect(socket: JwtAuthenticatedSocket): Promise<void> {
    if (!socket.decoded_token) return;
    const { id: playerId, gameId } = socket.decoded_token;
    L.info(`Player ${playerId} disconnected.`);

    await DBService.updateGame(gameId, async (fullGameState) => {
      return GameService.updatePlayer(fullGameState, playerId, {
        isActive: false,
        socketId: undefined,
      });
    });

    await DBService.deleteUserLock(playerId);
    await this.sendUpdated(socket, gameId, ['gamestate']);
  }

  static async sendUpdated(
    io: socketIo.Server | socketIo.Socket,
    gameId: UUID,
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
    await updateRound(this.gameId, roundIndex, async (_prevRound, prevGameState) => {
      const gameState = GameService.playRound(prevGameState, roundIndex);
      this.addTimeoutHandler(gameState);
      return { gameState };
    });
    return Controller.sendUpdated(this.io, this.gameId, ['round', 'player']);
  };

  setRoundRevealed = async (roundIndex: number): Promise<void> => {
    await updateRound(this.gameId, roundIndex, async (_prevRound, prevGameState) => {
      const gameState = GameService.revealRound(prevGameState, roundIndex);
      this.addTimeoutHandler(gameState);
      return { gameState };
    });
    return Controller.sendUpdated(this.io, this.gameId, ['round']);
  };

  setRoundEnded = async (roundIndex: number): Promise<void> => {
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
        this.addTimeoutHandler(gameState);
      }
      return { gameState };
    });

    if (gameShouldEnd) {
      return this.setGameEnded();
    }
    return Controller.sendUpdated(this.io, this.gameId, ['gamestate', 'player']);
  };

  setGameEnded = async (): Promise<void> => {
    await DBService.updateGame(this.gameId, async (fullGameState) => {
      assert(fullGameState.game.status !== GameStatus.Ended, 'Game is already ended.');
      return GameService.endGame(fullGameState);
    });
    await this.clearTimeouts();

    return Controller.sendUpdated(this.io, this.gameId, ['gamestate']);
  };

  // Timeout handlers

  addTimeoutHandler = async (fullGameState: InternalGameState): Promise<void> => {
    const [roundIdx, round] = _.last(fullGameState.rounds.map((val, idx) => [idx, val]));
    assert(roundIdx >= 0 && round, 'No round found.');
    await queue.clearJobsForGame(this.gameId);

    const [eventName, eventTimeout] = _.chain(round.timeouts)
      .toPairs()
      .sortBy(1)
      .last()
      .value() as [RoundTimeoutKeys, Date];

    const timeoutMs = (eventTimeout?.getTime() || 0) - _.now();
    assert(timeoutMs > 0, `No timeout to set (value: ${timeoutMs}).`);

    const logPrefix = `Game ${this.gameId} - Player ${this.playerId} - Timeout ${eventName} at round ${roundIdx}`;
    L.info('%s - remaining: %d ms.', logPrefix, timeoutMs);

    await queue.addJob({ gameId: this.gameId, roundIdx, eventName }, timeoutMs);
  };

  clearTimeouts = (): Promise<boolean> => {
    return queue.clearJobsForGame(this.gameId);
  };

  // Event handlers

  onJoinGame = async (socket: JwtAuthenticatedSocket): Promise<void> => {
    await DBService.updateGame(this.gameId, async (fullGameState) => {
      let gameState = GameService.updatePlayer(fullGameState, this.playerId, {
        isActive: true,
        socketId: socket.id,
      });

      // If the game is running, we need to make sure the player has a full hand
      if (GameService.isGameRunning(gameState.game)) {
        gameState = GameService.refillHandForPlayers(gameState, [{ id: this.playerId }]);
      }

      return gameState;
    });

    return Controller.sendUpdated(this.io, this.gameId, ['gamestate', 'player']);
  };

  onStartGame = async (): Promise<void> => {
    L.info('Game %s – Player %s – Received event onStartGame.', this.gameId, this.playerId);
    await DBService.updateGame(this.gameId, async (fullGameState) => {
      assert(GameService.isHost(fullGameState, this.playerId), 'Only a host can start a game.');
      const gameState = GameService.startGame(fullGameState);
      this.addTimeoutHandler(gameState);
      return gameState;
    });

    return Controller.sendUpdated(this.io, this.gameId, ['gamestate', 'player']);
  };

  onStartNextRound = async (): Promise<void> => {
    L.info('Game %s – Player %s – Received event onStartNextRound.', this.gameId, this.playerId);
    let gameShouldEnd = false;
    await DBService.updateGame(this.gameId, async (fullGameState) => {
      assert(GameService.isGameRunning(fullGameState.game), 'Only running games can be updated.');

      // validate isActive state of players
      let gameState = _.cloneDeep(fullGameState);

      const isActive = await Promise.all(
        gameState.players.map((p) => p.isActive && DBService.isUserLocked(p.id))
      );
      gameState.players = gameState.players.map((p, idx) => ({ ...p, isActive: isActive[idx] }));

      // End if no-one is active
      const activeHumanPlayerIds = gameState.players
        .filter((p) => p.isActive && !p.isAI)
        .map((p) => p.id);
      gameShouldEnd = gameShouldEnd || activeHumanPlayerIds.length === 0;

      // End if no submissions for the last two rounds
      if (gameState.rounds.length >= 2) {
        gameShouldEnd =
          gameShouldEnd ||
          _.takeRight(gameState.rounds, 2).every((r) => r.submissions.length === 0);
      }

      if (!gameShouldEnd) {
        gameState = GameService.newRound(fullGameState);
        this.addTimeoutHandler(gameState);
      }
      return gameState;
    });

    if (gameShouldEnd) {
      return this.setGameEnded();
    }
    return Controller.sendUpdated(this.io, this.gameId, ['gamestate', 'player']);
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
      return this.setRoundPlayed(roundIndex);
    }
    return Controller.sendUpdated(this.io, this.gameId, ['round', 'player']);
  };

  onDiscardCards = async (data: MessagePickCards): Promise<void> => {
    L.info(
      'Game %s – Player %s – Received event onDiscardCards: %o.',
      this.gameId,
      this.playerId,
      data
    );
    const { roundIndex, cards: discardedCards } = data;
    await updateRound(this.gameId, roundIndex, async (_round, prevGameState) => {
      const gameState = GameService.discardCards(
        prevGameState,
        roundIndex,
        this.playerId as UUID,
        discardedCards
      );

      return { gameState };
    });

    return Controller.sendUpdated(this.io, this.gameId, ['player']);
  };

  onDiscardPrompt = async (data: MessageDiscardPrompt): Promise<void> => {
    L.info(
      'Game %s – Player %s – Received event onDiscardPrompt: %o.',
      this.gameId,
      this.playerId,
      data
    );
    const { roundIndex } = data;
    await updateRound(this.gameId, roundIndex, async (_round, prevGameState) => {
      const gameState = GameService.discardPrompt(prevGameState, roundIndex, this.playerId as UUID);

      return { gameState };
    });

    return Controller.sendUpdated(this.io, this.gameId, ['round', 'player']);
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
      return this.setRoundRevealed(roundIndex);
    }
    return Controller.sendUpdated(this.io, this.gameId, ['round']);
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
    return this.setRoundEnded(roundIndex);
  };

  onEndGame = async (): Promise<void> => {
    L.info('Game %s – Player %s – Received event onEndGame.', this.gameId, this.playerId);
    const gameState = await DBService.getGame(this.gameId);
    assert(GameService.isHost(gameState, this.playerId), 'Only a host can end a game.');
    return this.setGameEnded();
  };
}
