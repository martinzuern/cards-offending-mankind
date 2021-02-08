import type { Server } from 'socket.io';
import gameSockets from './sockets/controllers/games/socket';

export default function sockets(io: Server): void {
  gameSockets(io);
}
