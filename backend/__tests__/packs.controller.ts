import request from 'supertest';
import Server from '../server';

describe('Packs', () => {
  it('should get all packs', (done) =>
    request(Server)
      .get('/api/v1/packs')
      .expect('Content-Type', /json/)
      .expect((r) => {
        expect(r.body).toBeInstanceOf(Array);
        expect(r.body).toHaveLength(72);
        expect(r.body[0]).toEqual({
          abbr: 'BaseUK',
          description: 'The UK edition of the base game',
          icon: '',
          name: 'Base Set (UK Edition)',
          official: true,
          promptsCount: 90,
          responsesCount: 460,
        });
      })
      .end(done));
});
