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
import TimeoutQueue from '../sockets/controllers/games/queue';
import DBService from '../services/db.service';

const app = express();
const { exit } = process;
const env = process.env.NODE_ENV || 'development';

Sentry.init({ dsn: process.env.SENTRY_DSN, release: process.env.SHA });
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

  async listen(
    port: number
  ): Promise<{ app: Application; server: http.Server; closeServer: () => Promise<void> }> {
    try {
      // Init DB Connections
      await Promise.all([DBService.start(), TimeoutQueue.start()]);

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

      const io = socketIo(server);
      const ioAdapter = redisAdapter(process.env.REDIS_URL);
      io.adapter(ioAdapter);
      this.sockets(io);

      const closeServer = async () => {
        l.warn('Closing server ...');
        // let clients disconnect
        Object.values(io.sockets.connected).forEach((e) => e.disconnect(true));
        server.close();
        await new Promise((resolve) => setTimeout(resolve, 500));
        await ioAdapter.pubClient.quit();
        await ioAdapter.subClient.quit();
        await TimeoutQueue.shutdown();
        await DBService.shutdown();
        l.warn('Teardown completed.');
      };

      process.on('SIGTERM', closeServer);

      if (env !== 'test') {
        server.listen(port, (): void =>
          l.info(`up and running in ${env} @: ${os.hostname()} on port: ${port}}`)
        );
      }

      return { app, server, closeServer };
    } catch (error) {
      l.fatal(error);
      return exit(1);
    }
  }
}
