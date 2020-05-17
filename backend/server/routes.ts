import { Application } from 'express';
import packsRouter from './api/controllers/packs/router';
import gamesRouter from './api/controllers/games/router';

export default function routes(app: Application): void {
  app.use('/api/v1/packs', packsRouter);
  app.use('/api/v1/games', gamesRouter);
}
