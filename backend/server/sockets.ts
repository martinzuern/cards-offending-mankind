import socketIo from 'socket.io';

import gameSockets from './api/controllers/games/socket';

export default function sockets(io: SocketIO.Server): void {
  gameSockets(io);
}
