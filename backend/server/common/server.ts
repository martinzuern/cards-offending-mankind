import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import os from 'os';
import socketIo from 'socket.io';
import redisAdapter from 'socket.io-redis';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import compression from 'compression';

import l from './logger';
import errorHandler from '../api/middlewares/error.handler';

import installValidator from './openapi';

const app = express();
const { exit } = process;
const env = process.env.NODE_ENV || 'development';

Sentry.init({ dsn: process.env.SENTRY_DSN, release: process.env.COMMIT_SHORT_SHA });
app.use(Sentry.Handlers.requestHandler());

const publicDir = path.resolve(__dirname, '..', '..', 'public');

export default class ExpressServer {
  private routes: (app: Application) => void;

  private sockets: (io: socketIo.Server) => void;

  constructor() {
    app.use(
      helmet({
        contentSecurityPolicy: {
          reportOnly: true,
        },
      })
    );
    app.use(compression());
    app.use(bodyParser.json({ limit: process.env.REQUEST_LIMIT || '100kb' }));

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

  async listen(port: number): Promise<{ app: Application; server: http.Server }> {
    const welcome = (p: number) => (): void =>
      l.info(`up and running in ${env} @: ${os.hostname()} on port: ${p}}`);

    try {
      installValidator(app);
      this.routes(app);

      // Serving vue.js
      app.use(express.static(publicDir));
      app.get('*', (_, res) => {
        res.sendFile(path.resolve(publicDir, 'index.html'));
      });

      // Error handler
      app.use(Sentry.Handlers.errorHandler());
      app.use(errorHandler);

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
      return exit(1);
    }
  }
}
