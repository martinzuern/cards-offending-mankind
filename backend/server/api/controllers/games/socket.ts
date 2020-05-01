import socketIo from 'socket.io';

export default function sockets(io: socketIo.Server): void {

  // TODO validate token
  // https://socket.io/docs/client-api/#With-extraHeaders

  // io.on('connection', (client) => {
  //   console.log('new connection');
  // });
}
