import { Application } from 'express';
import examplesRouter from './api/controllers/examples/router';
import packsRouter from './api/controllers/packs/router';
import gamesRouter from './api/controllers/games/router';
export default function routes(app: Application): void {
  app.use('/api/v1/examples', examplesRouter);
  app.use('/api/v1/packs', packsRouter);
  app.use('/api/v1/games', gamesRouter);
}
