import request from 'supertest';
import Server from '../server';
import { v4 as uuidv4 } from 'uuid';

describe('Game without password', () => {
  let createdGame;

  describe('create', () => {
    it('should return error if missing params', (done) =>
      request(Server)
        .post('/api/v1/games')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400)
        .then((r) => {
          expect(r.body).toMatchInlineSnapshot(`
            Object {
              "errors": Array [
                Object {
                  "errorCode": "required.openapi.validation",
                  "message": "should have required property 'game'",
                  "path": ".body.game",
                },
                Object {
                  "errorCode": "required.openapi.validation",
                  "message": "should have required property 'player'",
                  "path": ".body.player",
                },
              ],
            }
          `);
          done();
        }));

    it('should return new game', (done) =>
      request(Server)
        .post('/api/v1/games')
        .send({ player: { nickname: 'foo' }, game: {} })
        .expect('Content-Type', /json/)
        .expect(201)
        .then((r) => {
          expect(r.body).toMatchSnapshot({
            game: {
              id: expect.any(String),
            },
            player: {
              id: expect.any(String),
              token: expect.any(String),
            },
          });
          createdGame = r.body;
          done();
        }));
  });

  describe('get', () => {
    it('renders 400 if not valid uuidv4', (done) =>
      request(Server)
        .get('/api/v1/games/foo')
        .expect('Content-Type', /json/)
        .expect(400)
        .then((r) => {
          expect(r.body).toMatchSnapshot();
          done();
        }));

    it('renders 404 if not found', (done) =>
      request(Server)
        .get(`/api/v1/games/${uuidv4()}`)
        .expect('Content-Type', /json/)
        .expect(404)
        .then((r) => {
          expect(r.body).toMatchSnapshot();
          done();
        }));

    it('allows to get game', (done) =>
      request(Server)
        .get(`/api/v1/games/${createdGame.game.id}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then((r) => {
          expect(r.body).toEqual({ game: createdGame.game });
          done();
        }));
  });

  describe('join', () => {
    it('barfs if no nickname given', (done) =>
      request(Server)
        .post(`/api/v1/games/${createdGame.game.id}/join`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(400)
        .then((r) => {
          expect(r.body).toMatchSnapshot();
          done();
        }));

    it('barfs if nickname already in use', (done) =>
      request(Server)
        .post(`/api/v1/games/${createdGame.game.id}/join`)
        .send({ nickname: 'foo' })
        .expect('Content-Type', /json/)
        // .expect(400)
        .then((r) => {
          expect(r.body).toMatchSnapshot();
          done();
        }));

    it('allows to join game', (done) =>
      request(Server)
        .post(`/api/v1/games/${createdGame.game.id}/join`)
        .send({ nickname: 'foo2' })
        .expect('Content-Type', /json/)
        .expect(200)
        .then((r) => {
          expect(r.body).toMatchSnapshot({
            player: {
              id: expect.any(String),
              token: expect.any(String),
            },
          });
          done();
        }));
  });
});

describe('Game with password', () => {
  const password = 'password123';
  let createdGame;

  describe('create', () => {
    it('should return new game', (done) =>
      request(Server)
        .post('/api/v1/games')
        .send({ player: { nickname: 'foo' }, game: { password } })
        .expect('Content-Type', /json/)
        .expect(201)
        .then((r) => {
          expect(r.body).toMatchSnapshot({
            game: {
              id: expect.any(String),
            },
            player: {
              id: expect.any(String),
              token: expect.any(String),
            },
          });
          createdGame = r.body;
          done();
        }));
  });

  describe('get', () => {
    it('allows to get game', (done) =>
      request(Server)
        .get(`/api/v1/games/${createdGame.game.id}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then((r) => {
          expect(r.body).toEqual({ game: createdGame.game });
          done();
        }));
  });

  describe('join', () => {
    it('barfs if no password given', (done) =>
      request(Server)
        .post(`/api/v1/games/${createdGame.game.id}/join`)
        .send({ nickname: 'foo2' })
        .expect('Content-Type', /json/)
        // .expect(400)
        .then((r) => {
          expect(r.body).toMatchSnapshot();
          done();
        }));

    it('barfs if wrong password given', (done) =>
      request(Server)
        .post(`/api/v1/games/${createdGame.game.id}/join`)
        .send({ nickname: 'foo2', password: 'wrong' })
        .expect('Content-Type', /json/)
        // .expect(400)
        .then((r) => {
          expect(r.body).toMatchSnapshot();
          done();
        }));

    it('allows to join game', (done) =>
      request(Server)
        .post(`/api/v1/games/${createdGame.game.id}/join`)
        .send({ nickname: 'foo2', password })
        .expect('Content-Type', /json/)
        .expect(200)
        .then((r) => {
          expect(r.body).toMatchSnapshot({
            player: {
              id: expect.any(String),
              token: expect.any(String),
            },
          });
          done();
        }));
  });
});
