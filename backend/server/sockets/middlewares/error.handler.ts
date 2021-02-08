import * as Sentry from '@sentry/node';
import { JwtAuthenticatedSocket } from '../controllers/games/controller';
import L from '../../common/logger';

export default function wrapAsync(
  socket: JwtAuthenticatedSocket,
  fn: (...args: unknown[]) => Promise<void>
) {
  return (...args: unknown[]): Promise<void> =>
    fn(...args).catch((err: Error) => {
      Sentry.captureException(err);
      const msg = { message: err.message, type: err.name };
      L.warn(
        'Game %s - Player %s - Error: %o',
        socket.decodedToken.gameId,
        socket.decodedToken.id,
        msg
      );
      L.error(err);
      socket.emit('exception', msg);
    });
}
