import socketIo from 'socket.io';
import socketioJwt from 'socketio-jwt';
import _ from 'lodash';

import DBService from '../../../services/db.service';
import Controller, { JwtAuthenticatedSocket } from './controller';
import wrapAsync from '../../middlewares/error.handler';
import L from '../../../common/logger';

const { JWT_SECRET } = process.env;

const auth = socketioJwt.authorize({ secret: JWT_SECRET, additional_auth: Controller.validateJwt });

export default function sockets(io: socketIo.Server): void {
  io.on('connection', auth)
    .on('disconnect', Controller.onDisconnect)
    .on('authenticated', async (socket: JwtAuthenticatedSocket) => {
      const { id: playerId, gameId } = socket.decoded_token;
      const room = `game:${gameId}`;

      // make sure we keep the user lock
      socket.conn.on('packet', async (packet) => {
        if (packet.type === 'ping') {
          await DBService.setUserLock(playerId);
        }
      });

      L.info(`Player ${playerId} authenticated for game ${gameId}.`);
      socket.join(room);

      const c = new Controller(io, socket, room);
      const wrapper = _.partial(wrapAsync, socket);

      wrapper(c.joinGame)();
      socket.on('start-game', wrapper(c.startGame));
    });
}
