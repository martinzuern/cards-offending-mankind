import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import os from 'os';
import socketIo from 'socket.io';
import redisAdapter from 'socket.io-redis';
import helmet from 'helmet';

import l from './logger';

import installValidator from './openapi';

const app = express();
const { exit } = process;
const env = process.env.NODE_ENV || 'development';

export default class ExpressServer {
  private routes: (app: Application) => void;
  private sockets: (io: socketIo.Server) => void;

  constructor() {
    const root = path.normalize(`${__dirname}/../..`);

    app.use(helmet());
    app.use(bodyParser.json({ limit: process.env.REQUEST_LIMIT || '100kb' }));
    app.use(express.static(`${root}/public`));

    // We don't need CORS in prod, as we serve the frontend directly
    if (env !== 'production') app.use(cors());
  }

  router(routes: (app: Application) => void): ExpressServer {
    this.routes = routes;
    return this;
  }

  socket(sockets: (io: socketIo.Server) => void): ExpressServer {
    this.sockets = sockets;
    return this;
  }

  // eslint-disable-next-line consistent-return
  async listen(port: number): Promise<{ app: Application; server: http.Server }> {
    const welcome = (p: number) => (): void =>
      l.info(`up and running in ${env} @: ${os.hostname()} on port: ${p}}`);

    try {
      await installValidator(app, this.routes);

      const server = http.createServer(app);
      if (this.sockets) {
        const io = socketIo(server);
        io.adapter(redisAdapter(process.env.REDIS_URL));
        this.sockets(io);
      }

      if (env !== 'test') {
        server.listen(port, welcome(port));
      }

      return { app, server };
    } catch (error) {
      l.error(error);
      exit(1);
    }
  }
}
