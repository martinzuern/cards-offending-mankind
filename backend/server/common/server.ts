import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import os from 'os';
import cookieParser from 'cookie-parser';
import socketIo from 'socket.io';

import l from './logger';

import installValidator from './openapi';

const app = express();
const exit = process.exit;

export default class ExpressServer {
  private routes: (app: Application) => void;
  private sockets: (io: socketIo.Server) => void;

  constructor() {
    const root = path.normalize(__dirname + '/../..');
    app.use(cors);
    app.set('appPath', root + 'client');
    app.use(bodyParser.json({ limit: process.env.REQUEST_LIMIT || '100kb' }));
    app.use(bodyParser.urlencoded({ extended: true, limit: process.env.REQUEST_LIMIT || '100kb' }));
    app.use(bodyParser.text({ limit: process.env.REQUEST_LIMIT || '100kb' }));
    app.use(cookieParser(process.env.SESSION_SECRET));
    app.use(express.static(`${root}/public`));
  }

  router(routes: (app: Application) => void): ExpressServer {
    this.routes = routes;
    return this;
  }

  socket(sockets: (io: socketIo.Server) => void): ExpressServer {
    this.sockets = sockets;
    return this;
  }

  listen(port: number): Application {
    const welcome = (p: number) => () =>
      l.info(
        `up and running in ${
          process.env.NODE_ENV || 'development'
        } @: ${os.hostname()} on port: ${p}}`
      );

    installValidator(app, this.routes)
      .then(() => {
        const server = http.createServer(app);
        if (this.sockets) {
          const io = socketIo(server);
          this.sockets(io);
        }
        server.listen(port, welcome(port));
      })
      .catch((e) => {
        l.error(e);
        exit(1);
      });

    return app;
  }
}
