import { JwtAuthenticatedSocket } from '../controllers/games/controller';
import L from '../../common/logger';

export default function wrapAsync(
  socket: JwtAuthenticatedSocket,
  fn: (...args: unknown[]) => Promise<void>
) {
  return (...args: unknown[]): Promise<void> =>
    fn(...args).catch((err: Error) => {
      const msg = { message: err.message, type: err.name };
      L.warn(
        'Game %s - Player %s - Error: %o',
        socket.decoded_token.gameId,
        socket.decoded_token.id,
        msg
      );
      L.error(err);
      socket.error(msg);
    });
}
