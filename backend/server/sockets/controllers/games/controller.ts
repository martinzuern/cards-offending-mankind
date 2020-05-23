/* eslint-disable lines-between-class-members */
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
  RoundSubmission,
  UUID,
  GameState,
  Player,
  MessageRoundUpdated,
} from '../../../../root-types';
import L from '../../../common/logger';
import DBService from '../../../services/db.service';
import GameService from '../../../services/game.service';

export type JwtAuthenticatedSocket = SocketIO.Socket & {
  decoded_token: PlayerJWT;
};

const updatePlayer = async (
  gameId: string,
  playerId: string,
  data: Partial<InternalPlayer>
): Promise<void> => {
  await DBService.updateGame(gameId, async (fullGameState) => ({
    ...fullGameState,
    players: fullGameState.players.map((player: InternalPlayer) =>
      playerId !== player.id ? player : { ...player, ...data }
    ),
  }));
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

  constructor(io: socketIo.Server, socket: JwtAuthenticatedSocket) {
    const { id: playerId, gameId } = socket.decoded_token;
    this.io = io;
    this.socket = socket;
    this.playerId = playerId;
    this.gameId = gameId;
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
    await updatePlayer(gameId, playerId, { isActive: false, socketId: undefined });
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
    }

    if (information.includes('round')) {
      const roundIndex: number = gameState.rounds.length - 1;
      const msgRound: MessageRoundUpdated = {
        roundIndex,
        round: GameService.stripRound(gameState.rounds[roundIndex]),
      };
      io.to(this.getRoomName(gameId)).emit('round_updated', msgRound);
    }

    if (information.includes('player')) {
      gameState.players
        .filter((player) => player.isActive)
        .forEach((player: InternalPlayer) => {
          const msgPlayer: Player = _.omit(player, ['socketId']);
          io.to(player.socketId).emit('player_updated', msgPlayer);
        });
    }
  }

  // Other actions

  setRoundPlayed = async (roundIndex: number): Promise<void> => {
    await updateRound(this.gameId, roundIndex, async (_prevRound, prevGameState) => {
      const gameState = GameService.playRound(prevGameState, roundIndex);
      return { gameState };
    });
    await Controller.sendUpdated(this.io, this.gameId, ['round', 'player']);
  };

  setRoundRevealed = async (roundIndex: number): Promise<void> => {
    await updateRound(this.gameId, roundIndex, async (_prevRound, prevGameState) => {
      const gameState = GameService.revealRound(prevGameState, roundIndex);
      return { gameState };
    });
    await Controller.sendUpdated(this.io, this.gameId, ['round']);
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

  // Event handlers

  onJoinGame = async (): Promise<void> => {
    await updatePlayer(this.gameId, this.playerId, { isActive: true, socketId: this.socket.id });
    await Controller.sendUpdated(this.io, this.gameId, ['gamestate']);
  };

  onStartGame = async (): Promise<void> => {
    await DBService.updateGame(this.gameId, async (fullGameState) => {
      assert(GameService.isHost(fullGameState, this.playerId), 'Only a host can start a game.');
      return GameService.startGame(fullGameState);
    });

    await Controller.sendUpdated(this.io, this.gameId, ['gamestate', 'player']);
  };

  onPickCards = async ({ roundIndex, cards: pickedCards }: MessagePickCards): Promise<void> => {
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

  onRevealSubmission = async ({
    roundIndex,
    submissionIndex,
  }: MessageRevealSubmission): Promise<void> => {
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

  onChooseWinner = async ({ roundIndex, submissionIndex }: MessageChooseWinner): Promise<void> => {
    await updateRound(this.gameId, roundIndex, async (round) => {
      assert(round.judgeId === this.playerId, 'Only the judge can choose a winner.');
      return { round: GameService.chooseWinner(round, submissionIndex) };
    });
    this.setRoundEnded(roundIndex);
  };

  onStartNextRound = async (): Promise<void> => {
    await DBService.updateGame(this.gameId, async (gameState) => {
      assert(gameState.game.status === GameStatus.Running, 'Only running games can be updated.');
      return GameService.newRound(gameState);
    });
    await Controller.sendUpdated(this.io, this.gameId, ['gamestate']);
  };

  onEndGame = async (): Promise<void> => {
    const gameState = await DBService.getGame(this.gameId);
    assert(GameService.isHost(gameState, this.playerId), 'Only a host can end a game.');
    this.setGameEnded();
  };
}
