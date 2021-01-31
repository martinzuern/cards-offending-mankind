import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import ServerInstance from '../server';
import type { Application } from 'express';

let App: Application;
let Teardown: () => Promise<void>;

beforeAll(async (done) => {
  const { app, closeServer } = await ServerInstance;
  App = app;
  Teardown = closeServer;
  done();
});

afterAll((done) => Teardown().then(() => done()), 90000);

describe('Game without password', () => {
  let createdGame;

  describe('create', () => {
    it('should return error if missing params', (done) =>
      request(App)
        .post('/api/v1/games')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400)
        .expect((r) => {
          expect(r.body).toMatchSnapshot();
        })
        .end(done));

    it('should return new game', (done) =>
      request(App)
        .post('/api/v1/games')
        .send({ player: { nickname: 'foo' }, game: {} })
        .expect('Content-Type', /json/)
        .expect(201)
        .expect((r) => {
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
        })
        .end(done));
  });

  describe('get', () => {
    it('renders 400 if not valid uuidv4', (done) =>
      request(App)
        .get('/api/v1/games/foo')
        .expect('Content-Type', /json/)
        .expect(400)
        .expect((r) => {
          expect(r.body).toMatchSnapshot();
        })
        .end(done));

    it('renders 404 if not found', (done) =>
      request(App)
        .get(`/api/v1/games/${uuidv4()}`)
        .expect('Content-Type', /json/)
        .expect(404)
        .expect((r) => {
          expect(r.body).toMatchSnapshot();
        })
        .end(done));

    it('allows to get game', (done) =>
      request(App)
        .get(`/api/v1/games/${createdGame.game.id}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .expect((r) => {
          expect(r.body).toEqual({ game: createdGame.game });
        })
        .end(done));
  });

  describe('join', () => {
    it('barfs if no nickname given', (done) =>
      request(App)
        .post(`/api/v1/games/${createdGame.game.id}/join`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(400)
        .expect((r) => {
          expect(r.body).toMatchSnapshot();
        })
        .end(done));

    it('barfs if nickname already in use', (done) =>
      request(App)
        .post(`/api/v1/games/${createdGame.game.id}/join`)
        .send({ nickname: 'foo' })
        .expect('Content-Type', /json/)
        .expect(400)
        .expect((r) => {
          expect(r.body).toMatchSnapshot();
        })
        .end(done));

    it('allows to join game', (done) =>
      request(App)
        .post(`/api/v1/games/${createdGame.game.id}/join`)
        .send({ nickname: 'foo2' })
        .expect('Content-Type', /json/)
        .expect(200)
        .expect((r) => {
          expect(r.body).toMatchSnapshot({
            player: {
              id: expect.any(String),
              token: expect.any(String),
            },
          });
        })
        .end(done));
  });
});

describe('Game with password', () => {
  const password = 'password123';
  let createdGame;

  describe('create', () => {
    it('should return new game', (done) =>
      request(App)
        .post('/api/v1/games')
        .send({ player: { nickname: 'foo' }, game: { password } })
        .expect('Content-Type', /json/)
        .expect(201)
        .expect((r) => {
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
        })
        .end(done));
  });

  describe('get', () => {
    it('allows to get game', (done) =>
      request(App)
        .get(`/api/v1/games/${createdGame.game.id}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .expect((r) => {
          expect(r.body).toEqual({ game: createdGame.game });
        })
        .end(done));
  });

  describe('join', () => {
    it('barfs if no password given', (done) =>
      request(App)
        .post(`/api/v1/games/${createdGame.game.id}/join`)
        .send({ nickname: 'foo2' })
        .expect('Content-Type', /json/)
        .expect(403)
        .expect((r) => {
          expect(r.body).toMatchSnapshot();
        })
        .end(done));

    it('barfs if wrong password given', (done) =>
      request(App)
        .post(`/api/v1/games/${createdGame.game.id}/join`)
        .send({ nickname: 'foo2', password: 'wrong' })
        .expect('Content-Type', /json/)
        .expect(403)
        .expect((r) => {
          expect(r.body).toMatchSnapshot();
        })
        .end(done));

    it('allows to join game', (done) =>
      request(App)
        .post(`/api/v1/games/${createdGame.game.id}/join`)
        .send({ nickname: 'foo2', password })
        .expect('Content-Type', /json/)
        .expect(200)
        .expect((r) => {
          expect(r.body).toMatchSnapshot({
            player: {
              id: expect.any(String),
              token: expect.any(String),
            },
          });
        })
        .end(done));
  });
});
