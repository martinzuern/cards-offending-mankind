import 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import Server from '../server';

describe('Packs', () => {
  it('should get all packs', () =>
    request(Server)
      .get('/api/v1/packs')
      .expect('Content-Type', /json/)
      .then((r) => {
        expect(r.body).to.be.an('array').of.length(72);
        expect(r.body[0]).to.eql({
          abbr: 'BaseUK',
          description: 'The UK edition of the base game',
          icon: '',
          name: 'Base Set (UK Edition)',
          official: true,
          promptsCount: 90,
          responsesCount: 460,
        });
      }));
});
