import request from 'supertest';
import ServerInstance from '../server';

let Server: unknown;

beforeAll(async (done) => {
  const { app } = await ServerInstance;
  Server = app;
  done();
});

describe('Packs', () => {
  it('should get all packs', (done) =>
    request(Server)
      .get('/api/v1/packs')
      .expect('Content-Type', /json/)
      .expect((r) => {
        expect(r.body).toBeInstanceOf(Array);
        expect(r.body).toHaveLength(99);
        expect(r.body[0]).toMatchSnapshot();
      })
      .end(done));
});
