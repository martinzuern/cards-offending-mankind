/* eslint-disable lines-between-class-members */
import assert from 'assert';
import socketIo from 'socket.io';
import _ from 'lodash';

import { PlayerJWT, InternalPlayer } from '../../../../root-types';
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
      assert(GameService.isGameJoinable(gameState.game), 'game-not-joinable');
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
    await this.sendGamestateUpdated(socket, gameId, false);
    await DBService.deleteUserLock(playerId);
  }

  static async sendGamestateUpdated(
    io: socketIo.Server | socketIo.Socket,
    gameId: string,
    includePlayers = true
  ): Promise<void> {
    const gameState = await DBService.getGame(gameId);
    io.to(this.getRoomName(gameId)).emit(
      'gamestate_updated',
      GameService.stripGameState(gameState)
    );

    if (includePlayers)
      gameState.players
        .filter((player) => player.isActive)
        .forEach((player: InternalPlayer) => {
          io.to(player.socketId).emit('player_updated', _.omit(player, ['socketId']));
        });
  }

  joinGame = async (): Promise<void> => {
    await updatePlayer(this.gameId, this.playerId, { isActive: true, socketId: this.socket.id });
    await Controller.sendGamestateUpdated(this.io, this.gameId, false);
  };

  startGame = async (): Promise<void> => {
    await DBService.updateGame(this.gameId, async (fullGameState) => {
      assert(GameService.isHost(fullGameState, this.playerId), 'Only a host can start a game.');
      return GameService.startGame(fullGameState);
    });

    await Controller.sendGamestateUpdated(this.io, this.gameId);
  };
}
