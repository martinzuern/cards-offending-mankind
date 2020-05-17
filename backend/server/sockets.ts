import gameSockets from './sockets/controllers/games/socket';

export default function sockets(io: SocketIO.Server): void {
  gameSockets(io);
}
