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
    result.rounds[roundIndex] = _.merge(round, newRound);
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setRoundPlayed = async (roundIndex: number): Promise<void> => {
    // TODO Check status
    // TODO add timeout
    // TODO set status
    // TODO shuffle submissions
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setRoundRevealed = async (roundIndex: number): Promise<void> => {
    // TODO Check status
    // TODO add timeout
    // TODO set status
    // TODO set status for all submissions
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setRoundEnded = async (roundIndex: number): Promise<void> => {
    // TODO Set status
    // TODO Remove timeouts
    // TODO Update points for player
    // TODO check that Game should not end, otherwise end
    // TODO Create timeout for new Round
  };

  setGameEnded = async (): Promise<void> => {
    // TODO Remove timeouts
    // TODO Update points for player
    // TODO hit Game Ended
    // TODO Update players
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onPickCards = async (data: MessagePickCards): Promise<void> => {
    const { roundIndex } = data;
    let pickComplete = false;
    await updateRound(this.gameId, roundIndex, async (round, gameState) => {
      assert(round.status === RoundStatus.Created, 'Round already past picking.');
      assert(round.judgeId !== this.playerId, 'Judge cannot pick cards.');
      assert(
        round.submissions.every((s) => s.playerId !== this.playerId),
        'Already picked cards.'
      );

      const myPlayer = _.find(gameState.players, {
        playerId: this.playerId,
        isActive: true,
      }) as InternalPlayer;
      assert(myPlayer);

      const cards = data.cards.map((card) => {
        const found = _.find(myPlayer.deck, card);
        assert(found, 'Invalid card');
        myPlayer.deck = _.without(myPlayer.deck, found);
        return found;
      });
      assert(cards.length === round.prompt.pick, 'Incorrect number of cards.');

      const newSubmission: RoundSubmission = {
        playerId: this.playerId as UUID,
        timestamp: new Date(),
        cards,
        pointsChange: 0,
        isRevealed: false,
      };
      round.submissions.push(newSubmission);

      pickComplete = round.submissions.length >= gameState.players.filter((p) => p.isActive).length;

      return { round, gameState };
    });

    if (pickComplete) {
      this.setRoundEnded(roundIndex);
    } else {
      await Controller.sendUpdated(this.io, this.gameId, ['round', 'player']);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onRevealSubmission = async (data: MessageRevealSubmission): Promise<void> => {
    // Check status
    // Check that player is judge
    // If all cards were revealed, trigger setRoundPlayed
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onChooseWinner = async (data: MessageChooseWinner): Promise<void> => {
    // Check status
    // Check that player is judge
    // Update Points in round
    // trigger setRoundEnded
  };

  onStartNextRound = async (): Promise<void> => {
    // Check status
    // Trigger next round
  };

  onEndGame = async (): Promise<void> => {
    await DBService.updateGame(this.gameId, async (fullGameState) => {
      assert(GameService.isHost(fullGameState, this.playerId), 'Only a host can end a game.');
      assert(fullGameState.game.status !== GameStatus.Ended, 'Game is already ended.');
      return GameService.endGame(fullGameState);
    });

    await Controller.sendUpdated(this.io, this.gameId, ['gamestate']);
  };
}
