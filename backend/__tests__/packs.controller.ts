import request from 'supertest';
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

afterAll((done) => Teardown().then(done), 90000);

describe('Packs', () => {
  it('should get all packs', (done) =>
    request(App)
      .get('/api/v1/packs')
      .expect('Content-Type', /json/)
      .expect((r) => {
        expect(r.body).toBeInstanceOf(Array);
        expect(r.body).toHaveLength(205);
        expect(r.body[0]).toMatchSnapshot();
      })
      .end(done));
});
