import './common/env';
import type { Application } from 'express';
import type { Server as ServerType } from 'http';
import Server from './common/server';
import routes from './routes';
import sockets from './sockets';

const port = parseInt(process.env.PORT, 10);

const startServer = (): Promise<{
  app: Application;
  server: ServerType;
  closeServer: () => Promise<void>;
}> => new Server().router(routes).socket(sockets).listen(port);

export default startServer();
