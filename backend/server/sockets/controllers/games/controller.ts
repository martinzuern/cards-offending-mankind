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

  setRoundPlayed = async (roundIndex: number): Promise<void> => {
    await updateRound(this.gameId, roundIndex, async (prevRound, prevGameState) => {
      assert(prevRound.status === RoundStatus.Created, 'Round already past picking.');
      const round = _.cloneDeep(prevRound);
      const now = new Date();

      if (round.submissions.length === 0) {
        round.status = RoundStatus.Ended;
        round.timeouts = {
          playing: now,
          revealing: now,
          judging: now,
          betweenRounds: new Date(now.getTime() + prevGameState.game.timeouts.betweenRounds),
        };
      } else {
        round.status = RoundStatus.Played;
        round.submissions = _.shuffle(round.submissions);
        round.timeouts = {
          playing: now,
          revealing: new Date(now.getTime() + prevGameState.game.timeouts.revealing),
        };
      }

      return { round };
    });
    await Controller.sendUpdated(this.io, this.gameId, ['round']);
  };

  setRoundRevealed = async (roundIndex: number): Promise<void> => {
    await updateRound(this.gameId, roundIndex, async (prevRound, prevGameState) => {
      assert(prevRound.status === RoundStatus.Played, 'Round has invalid status.');
      const round = _.cloneDeep(prevRound);
      const now = new Date();

      round.status = RoundStatus.Revealed;
      round.timeouts = {
        ...round.timeouts,
        revealing: now,
        judging: new Date(now.getTime() + prevGameState.game.timeouts.judging),
      };
      round.submissions = round.submissions.map((s) => ({ ...s, isRevealed: true }));
      return { round };
    });
    await Controller.sendUpdated(this.io, this.gameId, ['round']);
  };

  setRoundEnded = async (roundIndex: number): Promise<void> => {
    let gameShouldEnd = false;
    await updateRound(this.gameId, roundIndex, async (prevRound, prevGameState) => {
      assert(prevRound.status !== RoundStatus.Ended, 'Round has invalid status.');
      const round = _.cloneDeep(prevRound);
      const gameState = _.cloneDeep(prevGameState);

      gameState.players = gameState.players.map((player) => {
        const change = _.chain(round.submissions)
          .concat(round.discard)
          .filter((s) => s.playerId === player.id)
          .reduce((sum, s) => sum + s.pointsChange, 0)
          .value();
        return { ...player, points: player.points + change };
      });

      gameShouldEnd =
        !!gameState.game.winnerPoints &&
        gameState.players.some((p) => p.points >= gameState.game.winnerPoints);

      const now = new Date();
      round.status = RoundStatus.Ended;
      round.timeouts = {
        ...round.timeouts,
        judging: now,
      };

      if (!gameShouldEnd) {
        round.timeouts = {
          ...round.timeouts,
          betweenRounds: new Date(now.getTime() + prevGameState.game.timeouts.betweenRounds),
        };
      }

      return { round, gameState };
    });
    if (!gameShouldEnd) {
      await Controller.sendUpdated(this.io, this.gameId, ['gamestate']);
    } else {
      this.setGameEnded();
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
    await updateRound(this.gameId, roundIndex, async (round, gameState) => {
      assert(round.status === RoundStatus.Created, 'Incorrect round status.');
      assert(round.judgeId !== this.playerId, 'Judge cannot pick cards.');
      assert(
        round.submissions.every((s) => s.playerId !== this.playerId),
        'Player already picked cards.'
      );

      const myPlayer = _.find(gameState.players, {
        playerId: this.playerId,
        isActive: true,
      }) as InternalPlayer;
      assert(myPlayer);

      const cards = pickedCards.map((card) => {
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

      pickComplete =
        round.submissions.length >= gameState.players.filter((p) => p.isActive).length - 1;

      return { round, gameState };
    });

    if (pickComplete) {
      this.setRoundPlayed(roundIndex);
    } else {
      await Controller.sendUpdated(this.io, this.gameId, ['round', 'player']);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onRevealSubmission = async ({
    roundIndex,
    submissionIndex,
  }: MessageRevealSubmission): Promise<void> => {
    let revealComplete = false;
    await updateRound(this.gameId, roundIndex, async (round) => {
      assert(round.status === RoundStatus.Played, 'Incorrect round status.');
      assert(round.judgeId === this.playerId, 'Only judge can reveal.');
      assert(
        round.submissions[submissionIndex].isRevealed === false,
        'Submission already revealed.'
      );

      const submission = round.submissions[submissionIndex];
      assert(submission, 'Submission not found.');
      submission.isRevealed = true;

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
    await updateRound(this.gameId, roundIndex, async (prevRound, prevGameState) => {
      assert(prevRound.status === RoundStatus.Revealed, 'Incorrect round status.');
      assert(prevRound.judgeId === this.playerId, 'Only judge can choose winner.');

      const round = _.cloneDeep(prevRound);
      const gameState = _.cloneDeep(prevGameState);

      const submission = round.submissions[submissionIndex];
      assert(submission, 'Submission not found.');
      submission.pointsChange = 1;

      return { round, gameState };
    });
    this.setRoundEnded(roundIndex);
  };

  onStartNextRound = async (): Promise<void> => {
    // Check status
    // Trigger next round
  };

  onEndGame = async (): Promise<void> => {
    const gameState = await DBService.getGame(this.gameId);
    assert(GameService.isHost(gameState, this.playerId), 'Only a host can end a game.');
    this.setGameEnded();
  };
}
