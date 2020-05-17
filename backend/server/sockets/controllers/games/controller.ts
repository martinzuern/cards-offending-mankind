/* eslint-disable lines-between-class-members */
import assert from 'assert';
import socketIo from 'socket.io';
import _ from 'lodash';

import { PlayerJwt, FullPlayer } from '../../../../root-types';
import L from '../../../common/logger';
import DBService from '../../../services/db.service';
import GameService from '../../../services/game.service';

export type JwtAuthenticatedSocket = SocketIO.Socket & {
  decoded_token: PlayerJwt;
};

const updatePlayer = async (
  gameId: string,
  playerId: string,
  data: Partial<FullPlayer>
): Promise<void> => {
  await DBService.updateGame(gameId, async (fullGameState) => ({
    ...fullGameState,
    players: fullGameState.players.map((player: FullPlayer) =>
      playerId !== player.id ? player : { ...player, ...data }
    ),
  }));
};

export default class Controller {
  playerId: string;
  gameId: string;
  room: string;
  io: socketIo.Server;
  socket: JwtAuthenticatedSocket;

  constructor(io: socketIo.Server, socket: JwtAuthenticatedSocket, room: string) {
    const { id: playerId, gameId } = socket.decoded_token;
    this.io = io;
    this.socket = socket;
    this.room = room;
    this.playerId = playerId;
    this.gameId = gameId;
  }

  static async validateJwt(
    decoded: PlayerJwt,
    onSuccess: Function,
    onError: Function
  ): Promise<unknown> {
    L.info(`Player ${decoded.id} wants to connect to game ${decoded.gameId}.`);
    try {
      const gameState = await DBService.getGame(decoded.gameId);
      assert(gameState.players.some((el) => el.id === decoded.id));
      assert(GameService.isGameJoinable(gameState.game), 'game-not-joinable');
    } catch (error) {
      return onError(error.message);
    }

    if (await DBService.setUserLock(decoded.id, true)) {
      return onSuccess();
    }

    L.warn(`Player ${decoded.id} is already locked.`);
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
    io.to(`game:${gameId}`).emit('gamestate_updated', GameService.stripGameState(gameState));

    if (includePlayers)
      gameState.players
        .filter((player) => player.isActive)
        .forEach((player: FullPlayer) => {
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
