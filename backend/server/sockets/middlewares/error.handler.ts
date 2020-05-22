import { JwtAuthenticatedSocket } from '../controllers/games/controller';

export default function wrapAsync(
  socket: JwtAuthenticatedSocket,
  fn: (...args: unknown[]) => Promise<void>
) {
  return (...args: unknown[]): Promise<void> =>
    fn(...args).catch((err: Error) => {
      socket.error({ message: err.message, type: err.name });
    });
}
