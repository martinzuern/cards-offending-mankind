import ioFront from 'socket.io-client';
import { AddressInfo } from 'net';
import http from 'http';
import fetch from 'node-fetch';
import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';

import Server from '../server';

let socket: SocketIOClient.Socket;
let httpServer: http.Server;
let httpServerUrl: URL;

const postRequest = async (path, data): Promise<unknown> => {
  const res = await fetch(new URL(path, httpServerUrl), {
    method: 'post',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  assert(res.ok, `Error – ${json}`);
  return json;
};

const createNewGame = async (data: {}): Promise<unknown> =>
  postRequest('api/v1/games', { player: { nickname: 'foo' }, game: { ...data } });

beforeAll(async (done) => {
  httpServer = (await Server).server;
  httpServer.listen(undefined, () => {
    const addr = httpServer.address() as AddressInfo;
    // Square brackets are used for IPv6
    httpServerUrl = new URL(`http://[${addr.address}]:${addr.port}`);
    done();
  });
});

afterAll((done) => {
  httpServer.close(() => done());
});

beforeEach((done) => {
  socket = ioFront.connect(httpServerUrl.toString(), {
    reconnection: false,
    forceNew: true,
  });
  socket.on('connect', () => {
    expect(socket.connected).toBeTruthy();
    done();
  });
});

afterEach((done) => {
  if (socket.connected) socket.disconnect();
  done();
});

describe('joining game', () => {
  let createdGame;
  beforeAll(async (done) => {
    createdGame = await createNewGame({});
    done();
  });

  it('error jwt malformed', (done) => {
    socket
      .on('unauthorized', (error) => {
        expect(error).toMatchSnapshot();
        done();
      })
      .emit('authenticate', {
        token: 'this-aint-work',
      });
  });

  it('error jwt not valid', (done) => {
    socket
      .on('unauthorized', (error) => {
        expect(error).toMatchSnapshot();
        done();
      })
      .emit('authenticate', {
        token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmZGIxNzE4LWIyOTAtNDY4Yy1hZjc2LTk5MWE0ZTU5NGEwYiIsImdhbWVJZCI6ImM2NTZlOTUxLWQzMDQtNDZhYS1hZDE3LWIwN2MyMzk4NWQxNiIsImlhdCI6MTU4OTkyMzA1MSwiZXhwIjoxNTkwMDA5NDUxfQ.R-5Q0kACeySzySOh3rFyyzM43JoghbTaeHijy9X4DUI',
      });
  });

  it('accepts valid token', (done) => {
    socket
      .on('authenticated', () => {})
      .on('gamestate_updated', (data) => {
        expect(data).toMatchSnapshot({
          game: {
            id: expect.any(String),
          },
          players: [
            {
              id: expect.any(String),
            },
          ],
        });
        done();
      })
      .emit('authenticate', {
        token: createdGame.player.token,
      });
  });

  it('error on locked user', (done) => {
    socket
      .on('unauthorized', (error) => {
        expect(error).toMatchSnapshot();
        done();
      })
      .emit('authenticate', {
        token: createdGame.player.token,
      });
  });
});

describe('error starting game', () => {
  let createdGame;
  beforeEach(async (done) => {
    createdGame = await createNewGame({});
    done();
  });

  it('error when there are not enough players', (done) => {
    socket
      .on('error', (error) => {
        expect(error).toMatchSnapshot();
        done();
      })
      .on('unauthorized', (error) => {
        throw new Error(JSON.stringify(error));
      })
      .on('authenticated', () => {
        socket.emit('start-game');
      })
      .emit('authenticate', {
        token: createdGame.player.token,
      });
  });

  describe('with two players', () => {
    let socket2;
    let player2;
    beforeEach(async (done) => {
      player2 = await postRequest(`/api/v1/games/${createdGame.game.id}/join`, {
        nickname: uuidv4(),
      });
      socket2 = ioFront.connect(httpServerUrl.toString(), {
        reconnection: false,
        forceNew: true,
      });
      socket2.on('connect', () => {
        expect(socket2.connected).toBeTruthy();
        done();
      });
    });

    afterEach((done) => {
      if (socket2.connected) socket2.disconnect();
      done();
    });

    it('error when non-host starts game', (done) => {
      socket2
        .on('error', (error) => {
          expect(error).toMatchSnapshot();
          done();
        })
        .on('unauthorized', (error) => {
          throw new Error(JSON.stringify(error));
        })
        .on('authenticated', () => {
          socket2.emit('start-game');
        })
        .emit('authenticate', {
          token: player2.player.token,
        });
    });

    it('error when there are not enough packs', async (done) => {
      await new Promise((resolve, reject) => {
        socket2.on('error', reject).on('authenticated', resolve).emit('authenticate', {
          token: player2.player.token,
        });
      });

      socket
        .on('error', (error) => {
          expect(error).toMatchSnapshot();
          done();
        })
        .on('unauthorized', (error) => {
          throw new Error(JSON.stringify(error));
        })
        .on('authenticated', () => {
          socket.emit('start-game');
        })
        .emit('authenticate', {
          token: createdGame.player.token,
        });
    });
  });
});

describe('perform game', () => {
  let createdGame;
  let socket2;
  let player2;
  beforeEach(async (done) => {
    createdGame = await createNewGame({ packs: [{ abbr: 'BaseUK' }] });
    done();
  });
  beforeEach(async (done) => {
    player2 = await postRequest(`/api/v1/games/${createdGame.game.id}/join`, {
      nickname: 'foo2',
    });
    socket2 = ioFront.connect(httpServerUrl.toString(), {
      reconnection: false,
      forceNew: true,
    });
    socket2.on('connect', () => {
      expect(socket2.connected).toBeTruthy();
      done();
    });
  });
  afterEach((done) => {
    if (socket2.connected) socket2.disconnect();
    done();
  });

  it('works', async (done) => {
    await new Promise((resolve, reject) => {
      socket2.on('error', reject).on('authenticated', resolve).emit('authenticate', {
        token: player2.player.token,
      });
    });

    let updateCounter = 0;

    socket
      .on('authenticated', () => {
        socket.emit('start-game');
      })
      .on('unauthorized', (error) => {
        throw new Error(JSON.stringify(error));
      })
      .on('error', (error) => {
        throw new Error(JSON.stringify(error));
      })
      .on('player_updated', (data) => {
        expect(data).toMatchSnapshot({
          id: expect.any(String),
          deck: Array(10).fill({ value: expect.any(String) }),
        });
        done();
      })
      .on('gamestate_updated', (data) => {
        updateCounter += 1;
        if (updateCounter === 1) {
          return expect(data).toMatchSnapshot({
            game: {
              id: expect.any(String),
            },
            players: [
              {
                id: expect.any(String),
              },
              {
                id: expect.any(String),
              },
            ],
          });
        }

        expect(data).toMatchSnapshot({
          game: {
            id: expect.any(String),
          },
          players: expect.any(Array),
          rounds: [
            {
              judgeId: expect.any(String),
              prompt: expect.any(Object),
              timeouts: {
                playing: expect.any(String),
              },
            },
          ],
        });
      })
      .emit('authenticate', {
        token: createdGame.player.token,
      });
  });
});
