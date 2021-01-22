import socketIo from 'socket.io';
import { authorize } from '@thream/socketio-jwt';
import _ from 'lodash';

import queue from './queue';

import DBService from '../../../services/db.service';
import Controller, { JwtAuthenticatedSocket } from './controller';
import wrapAsync from '../../middlewares/error.handler';
import L from '../../../common/logger';

const { JWT_SECRET } = process.env;

export default function sockets(io: socketIo.Server): void {
  io.use(authorize({ secret: JWT_SECRET }));
  io.use(Controller.validateJwt);

  queue.setSocketServer(io);

  io.on('connection', async (socket: JwtAuthenticatedSocket) => {
    const { id: playerId, gameId } = socket.decodedToken;

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
    socket.on('discard_prompt', wrapper(c.onDiscardPrompt));
    socket.on('reveal_submission', wrapper(c.onRevealSubmission));
    socket.on('choose_winner', wrapper(c.onChooseWinner));
    socket.on('start_next_round', wrapper(c.onStartNextRound));
    socket.on('end_game', wrapper(c.onEndGame));
  });
}
