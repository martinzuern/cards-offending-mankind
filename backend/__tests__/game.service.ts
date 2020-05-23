import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';

import GameService from '../server/services/game.service';
import { InternalGameState, UUID } from '../root-types';

const GAME_PASSWORD = 'super-secure';
let ukGameState: InternalGameState;

describe('GameService', () => {
  describe('static information', () => {
    it('lists available packs', () => {
      const packs = GameService.getAvailablePacks();
      expect(packs).toMatchSnapshot();
    });
  });

  describe('create / join game', () => {
    it('creates empty game', async (done) => {
      const gameState = await GameService.initGameState({});
      expect(gameState).toMatchSnapshot({
        game: {
          id: expect.any(String),
        },
      });
      done();
    });

    it('creates game with two packs and password', async (done) => {
      const gameState = await GameService.initGameState({
        password: GAME_PASSWORD,
        packs: [{ abbr: 'BaseUK' }, { abbr: 'www' }],
      });
      expect(gameState).toMatchSnapshot({
        game: {
          id: expect.any(String),
          password: expect.any(String),
        },
      });
      ukGameState = gameState;
      done();
    });

    it('rejects invalid packs', async (done) => {
      expect.assertions(2);
      try {
        await GameService.initGameState({
          password: GAME_PASSWORD,
          // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
          // @ts-ignore
          packs: [{ abbr: 'BaseUK' }, {}],
        });
      } catch (error) {
        expect(error).toMatchSnapshot();
      }
      try {
        await GameService.initGameState({
          password: GAME_PASSWORD,
          packs: [{ abbr: 'BaseUKf' }],
        });
      } catch (error) {
        expect(error).toMatchSnapshot();
      }
      done();
    });

    describe('validates password', () => {
      let emptyGameState;

      beforeAll(async (done) => {
        emptyGameState = await GameService.initGameState({});
        done();
      });

      it('accepts correct', async (done) => {
        const result = await Promise.all([
          GameService.validateGamePassword(emptyGameState.game, ''),
          GameService.validateGamePassword(emptyGameState.game, 'foo'),
          GameService.validateGamePassword(ukGameState.game, GAME_PASSWORD),
        ]);
        expect(result).toMatchInlineSnapshot(`
          Array [
            true,
            true,
            true,
          ]
        `);
        done();
      });
      it('rejects undefined', async (done) => {
        expect.assertions(2);
        try {
          await GameService.validateGamePassword(ukGameState.game, undefined);
        } catch (error) {
          expect(error).toMatchInlineSnapshot(
            `[AssertionError: Error: Game password not provided.]`
          );
        }

        try {
          await GameService.validateGamePassword(ukGameState.game, '');
        } catch (error) {
          expect(error).toMatchInlineSnapshot(`[AssertionError: Error: Game password incorrect]`);
        }
        done();
      });
      it('rejects wrong type', async (done) => {
        expect.assertions(2);
        try {
          await GameService.validateGamePassword(ukGameState.game, (true as unknown) as string);
        } catch (error) {
          expect(error).toMatchInlineSnapshot(
            `[AssertionError: Error: Game password not provided.]`
          );
        }

        try {
          await GameService.validateGamePassword(ukGameState.game, (22 as unknown) as string);
        } catch (error) {
          expect(error).toMatchInlineSnapshot(
            `[AssertionError: Error: Game password not provided.]`
          );
        }
        done();
      });
      it('rejects incorrect', async (done) => {
        expect.assertions(1);
        try {
          await GameService.validateGamePassword(ukGameState.game, 'foo');
        } catch (error) {
          expect(error).toMatchInlineSnapshot(`[AssertionError: Error: Game password incorrect]`);
        }
        done();
      });
    });
  });

  describe('add player', () => {
    const gameId = uuidv4() as UUID;

    it('throws on missing nickname', () => {
      expect.assertions(1);
      try {
        GameService.initPlayer(gameId, {});
      } catch (error) {
        expect(error).toMatchInlineSnapshot(`[AssertionError: undefined == true]`);
      }
    });

    it('returns valid player', () => {
      const player = GameService.initPlayer(gameId, { nickname: 'foo' });
      expect(player).toMatchSnapshot({
        id: expect.any(String),
        token: expect.any(String),
      });
    });
  });

  describe('builds pile', () => {
    it('works', () => {
      const pile = GameService.buildPile(ukGameState.game);
      expect(pile.prompts.length).toBe(99);
      expect(pile.responses.length).toBe(481);
      expect({
        ...pile,
        prompts: expect.any(Array),
        responses: expect.any(Array),
      }).toMatchSnapshot();
    });

    it('is shuffled', () => {
      const pile1 = GameService.buildPile(ukGameState.game);
      const pile2 = GameService.buildPile(ukGameState.game);
      expect(pile1).not.toEqual(pile2);
    });
  });

  describe('start game', () => {
    it('works', async (done) => {
      const baseGameState = await GameService.initGameState({
        packs: [{ abbr: 'BaseUK' }],
      });
      baseGameState.players.push(
        _.omit(GameService.initPlayer('', { nickname: 'foo1', isActive: true }), 'token'),
        _.omit(GameService.initPlayer('', { nickname: 'foo2', isActive: true }), 'token'),
        _.omit(GameService.initPlayer('', { nickname: 'foo3', isActive: true }), 'token')
      );
      const newGameState = GameService.startGame(baseGameState);
      expect(newGameState.players.length).toBe(3);
      expect(newGameState.players.every((p) => p.deck.length === 10)).toBe(true);
      expect(newGameState.piles.responses.length).toBe(460 - 30);
      expect(newGameState.piles.prompts.length).toBe(90 - 1);
      done();
    });
  });
});
