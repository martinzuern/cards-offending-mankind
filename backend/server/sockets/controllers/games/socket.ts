import socketIo from 'socket.io';
import socketioJwt from 'socketio-jwt';
import _ from 'lodash';

import queue from './queue';

import DBService from '../../../services/db.service';
import Controller, { JwtAuthenticatedSocket } from './controller';
import wrapAsync from '../../middlewares/error.handler';
import L from '../../../common/logger';

const { JWT_SECRET } = process.env;

const auth = socketioJwt.authorize({ secret: JWT_SECRET, additional_auth: Controller.validateJwt });

export default function sockets(io: socketIo.Server): void {
  queue.setSocketServer(io);

  io.on('connection', auth).on('authenticated', async (socket: JwtAuthenticatedSocket) => {
    const { id: playerId, gameId } = socket.decoded_token;

    // make sure we keep the user lock
    socket.conn.on('packet', (packet) => {
      if (packet.type === 'ping') {
        DBService.setUserLock(playerId);
      }
    });

    L.info(`Player ${playerId} authenticated for game ${gameId}.`);
    socket.join(Controller.getRoomName(gameId));

    const wrapper = _.partial(wrapAsync, socket);

    socket.once(
      'disconnect',
      wrapper(() => Controller.onDisconnect(socket))
    );

    const c = new Controller(io, gameId, playerId);
    wrapper(c.onJoinGame)(socket);
    socket.on('start_game', wrapper(c.onStartGame));
    socket.on('pick_cards', wrapper(c.onPickCards));
    socket.on('discard_cards', wrapper(c.onDiscardCards));
    socket.on('reveal_submission', wrapper(c.onRevealSubmission));
    socket.on('choose_winner', wrapper(c.onChooseWinner));
    socket.on('start_next_round', wrapper(c.onStartNextRound));
    socket.on('end_game', wrapper(c.onEndGame));
  });
}
