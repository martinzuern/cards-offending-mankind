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

      // make sure we keep the user lock
      socket.conn.on('packet', (packet) => {
        if (packet.type === 'ping') {
          DBService.setUserLock(playerId);
        }
      });

      L.info(`Player ${playerId} authenticated for game ${gameId}.`);
      socket.join(Controller.getRoomName(gameId));

      const c = new Controller(io, socket);
      const wrapper = _.partial(wrapAsync, socket);

      wrapper(c.onJoinGame)();
      socket.on('start_game', wrapper(c.onStartGame));
      socket.on('pick_cards', wrapper(c.onPickCards));
      socket.on('reveal_submission', wrapper(c.onRevealSubmission));
      socket.on('choose_winner', wrapper(c.onChooseWinner));
      socket.on('start_next_round', wrapper(c.onStartNextRound));
      socket.on('end_game', wrapper(c.onEndGame));
    });
}