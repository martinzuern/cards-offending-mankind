import socketIo from 'socket.io';
import socketioJwt from 'socketio-jwt';

import GameService from '../../services/game.service';
import DBService from '../../services/db.service';
import L from '../../../common/logger';
import { PlayerJwt } from '../../../../root-types';

const JWT_SECRET = process.env.JWT_SECRET;

type JwtAuthenticatedSocket = SocketIO.Socket & {
  decoded_token: PlayerJwt;
};

export default function sockets(io: socketIo.Server): void {
  io.on(
    'connection',
    socketioJwt.authorize({
      secret: JWT_SECRET,
      // eslint-disable-next-line @typescript-eslint/camelcase
      additional_auth: async (decoded: PlayerJwt, onSuccess, onError) => {
        L.info(`Player ${decoded.id} wants to connect to game ${decoded.gameId}.`);
        const canConnect = await DBService.setUserLock(decoded.id, true);

        if (canConnect) {
          return onSuccess();
        } else {
          L.warn(`Player ${decoded.id} is locked.`);
          return onError('user-locked');
        }
      },
      timeout: 1000 * 15, // 15 seconds
    })
  )
    .on('authenticated', async (socket: JwtAuthenticatedSocket) => {
      const { id: playerId, gameId } = socket.decoded_token;
      const roomName = `game:${gameId}`;
      L.info(`Player ${playerId} authenticated for ${roomName}.`);

      const gameState = await DBService.getGame(gameId);
      if (!GameService.isGameJoinable(gameState.game)) {
        L.warn(`Game ${gameId} is not joinable.`);
        socket.emit('exception', { errorMessage: 'Game is not joinable.' });
        socket.disconnect(true);
        return;
      }

      // make sure we keep the user lock
      socket.conn.on('packet', async (packet) => {
        if (packet.type === 'ping') {
          await DBService.setUserLock(playerId);
        }
      });

      // Add to correct room
      socket.join(roomName);
    })
    .on('disconnect', async (socket: JwtAuthenticatedSocket) => {
      const playerId = socket?.decoded_token?.id;
      if (!playerId) return;
      await DBService.deleteUserLock(playerId);
    });
}
