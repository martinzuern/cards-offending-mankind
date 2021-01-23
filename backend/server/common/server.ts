import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import os from 'os';
import { Server } from 'socket.io';
import { createAdapter } from 'socket.io-redis';
import { RedisClient } from 'redis';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import compression from 'compression';
import _ from 'lodash';

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

  private sockets: (io: Server) => void;

  constructor() {
    app.use(Sentry.Handlers.requestHandler());

    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          },
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

  socket(sockets: (io: Server) => void): ExpressServer {
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

      const devCorsOpts = {
        origin: ['http://localhost', 'http://localhost:8080'],
      };
      const io = new Server(server, {
        cors: env !== 'development' ? undefined : devCorsOpts,
      });
      const pubClient = new RedisClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter({ pubClient, subClient }));
      this.sockets(io);

      const closeServer = _.once(async () => {
        l.warn('Closing server ...');
        io.sockets.sockets.forEach((e) => e.disconnect(true));
        await new Promise((resolve) => server.close(resolve));
        l.warn('Closing DB connections ...');
        await pubClient.quit();
        await subClient.quit();
        await TimeoutQueue.shutdown();
        await DBService.shutdown();
        l.warn('Teardown completed.');
      });

      ['SIGINT', 'SIGTERM'].forEach((event) => process.on(event, closeServer));
      
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
