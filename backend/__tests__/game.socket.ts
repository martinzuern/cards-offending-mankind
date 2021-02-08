import { Socket, io as ioFront } from 'socket.io-client';
import { AddressInfo } from 'net';
import http from 'http';
import fetch from 'node-fetch';
import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';

import Server from '../server';
import { GameState, Player } from '../../types';

let httpServer: http.Server;
let Teardown: () => Promise<void>;
let socket: Socket;
let httpServerUrl: URL;

const promiseTimeout = (ms, promise) => {
  // Create a promise that rejects in <ms> milliseconds
  const timeout = new Promise((_, reject) => {
    let id = setTimeout(() => {
      clearTimeout(id);
      reject('Timed out in ' + ms + 'ms.');
    }, ms);
  });

  return Promise.race([promise, timeout]);
};

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

const newSocket = async (token: string): Promise<Socket> => {
  const s = ioFront(httpServerUrl.toString(), {
    extraHeaders: { Authorization: `Bearer ${token}` },
    reconnection: false,
    forceNew: true,
  });
  return promiseTimeout(
    500,
    new Promise<Socket>((resolve) => {
      s.on('connect', () => {
        expect(s.connected).toBeTruthy();
        resolve(s);
      });
    })
  );
};

const createNewGame = async (data: {}): Promise<GameState> =>
  (postRequest('api/v1/games', {
    player: { nickname: 'foo' },
    game: { ...data },
  }) as unknown) as GameState;

const joinGame = async (createdGame: GameState, nickname = '') => {
  nickname = nickname || uuidv4();
  return postRequest(`/api/v1/games/${createdGame.game.id}/join`, {
    nickname,
  });
};

beforeAll(async (done) => {
  const { server, closeServer } = await Server;
  httpServer = server;
  Teardown = closeServer;

  httpServer.listen(undefined, '127.0.0.1', () => {
    const addr = httpServer.address() as AddressInfo;
    httpServerUrl = new URL(`http://localhost:${addr.port}`);
    done();
  });
});

afterAll((done) => Teardown().then(done), 90000);

afterEach(() => {
  if (socket && socket.connected) socket.disconnect();
});

describe('joining game', () => {
  let createdGame;
  beforeAll(async (done) => {
    createdGame = await createNewGame({});
    done();
  });

  it('error jwt malformed', async (done) => {
    let token = 'this-aint-work';
    socket = ioFront(httpServerUrl.toString(), {
      extraHeaders: { Authorization: `Bearer ${token}` },
      reconnection: false,
      forceNew: true,
    });
    socket.on('connect_error', (error) => {
      expect(error).toMatchSnapshot();
      done();
    });
  });

  it('error jwt not valid', (done) => {
    let token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmZGIxNzE4LWIyOTAtNDY4Yy1hZjc2LTk5MWE0ZTU5NGEwYiIsImdhbWVJZCI6ImM2NTZlOTUxLWQzMDQtNDZhYS1hZDE3LWIwN2MyMzk4NWQxNiIsImlhdCI6MTU4OTkyMzA1MSwiZXhwIjoxNTkwMDA5NDUxfQ.R-5Q0kACeySzySOh3rFyyzM43JoghbTaeHijy9X4DUI';
    socket = ioFront(httpServerUrl.toString(), {
      extraHeaders: { Authorization: `Bearer ${token}` },
      reconnection: false,
      forceNew: true,
    });
    socket.on('connect_error', (error) => {
      expect(error).toMatchSnapshot();
      done();
    });
  });

  it('accepts valid token', async (done) => {
    socket = await newSocket(createdGame.player.token);
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
      });
  });

  it('error on locked user', async (done) => {
    socket = await newSocket(createdGame.player.token);
    const socket2 = ioFront(httpServerUrl.toString(), {
      extraHeaders: { Authorization: `Bearer ${createdGame.player.token}` },
      reconnection: false,
      forceNew: true,
    });
    socket2.on('connect_error', (error) => {
      expect(error).toMatchSnapshot();
      socket2.disconnect();
      done();
    });
  });
});

describe('error starting game', () => {
  let createdGame;
  beforeEach(async (done) => {
    createdGame = await createNewGame({});
    done();
  });

  it('error when there are not enough players', async (done) => {
    socket = await newSocket(createdGame.player.token);
    socket.emit('start_game');
    socket
      .on('exception', (error) => {
        expect(error).toMatchSnapshot();
        done();
      })
      .on('connect_error', (error) => {
        throw new Error(JSON.stringify(error));
      });
  });

  describe('with two players', () => {
    let socket2;
    let player2;
    let socket3;
    let player3;
    beforeEach(async (done) => {
      socket = await newSocket(createdGame.player.token);
      player2 = await joinGame(createdGame);
      player3 = await joinGame(createdGame);
      socket2 = await newSocket(player2.player.token);
      socket3 = await newSocket(player3.player.token);
      done();
    });

    afterEach(() => {
      if (socket2.connected) socket2.disconnect();
      if (socket3.connected) socket3.disconnect();
    });

    it('error when non-host starts game', (done) => {
      socket2.emit('start_game');
      socket2
        .on('exception', (error) => {
          expect(error).toMatchSnapshot();
          done();
        })
        .on('connect_error', (error) => {
          throw new Error(JSON.stringify(error));
        });
    });

    it('error when there are not enough packs', async (done) => {
      socket.emit('start_game');
      socket
        .on('exception', (error) => {
          expect(error).toMatchSnapshot();
          done();
        })
        .on('connect_error', (error) => {
          throw new Error(JSON.stringify(error));
        });
    });
  });
});

describe('perform game', () => {
  let createdGame;
  let socket2;
  let player2;
  let socket3;
  let player3;

  beforeEach(async (done) => {
    createdGame = await createNewGame({ packs: [{ abbr: 'Base-INTL' }] });
    done();
  });

  beforeEach(async (done) => {
    player2 = await joinGame(createdGame, 'foo2');
    player3 = await joinGame(createdGame, 'foo3');
    socket2 = await newSocket(player2.player.token);
    socket3 = await newSocket(player3.player.token);
    done();
  });

  afterEach(() => {
    if (socket2.connected) socket2.disconnect();
    if (socket3.connected) socket3.disconnect();
  });

  it('works', async (done) => {
    socket = await newSocket(createdGame.player.token);
    let latestGameState: GameState = {} as GameState;
    let latestPlayer: Player = {} as Player;
    socket
      .on('connect_error', (error) => {
        throw new Error(JSON.stringify(error));
      })
      .on('exception', (error) => {
        throw new Error(JSON.stringify(error));
      })
      .on('gamestate_updated', (data) => {
        latestGameState = data;
      })
      .on('player_updated', (data) => {
        latestPlayer = data;
      })
      .emit('start_game');

    setTimeout(() => {
      expect(latestGameState).toMatchSnapshot({
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
      expect(latestPlayer).toMatchSnapshot({
        id: expect.any(String),
        deck: expect.any(Array),
      });
      expect(
        latestPlayer.deck.length >= 10 || latestGameState.rounds[-1].judgeId === latestPlayer.id
      ).toBeTruthy();
      done();
    }, 5000);
  }, 30000);
});
