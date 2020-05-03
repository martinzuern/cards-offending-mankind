import _ from 'lodash';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import CardDecksRaw from 'json-against-humanity/full.md.json';

import {
  FullGameState,
  FullGame,
  Player,
  FullPlayer,
  GameState,
  Game,
  PackInformation,
} from '../../../root-types';
import { HttpError } from '../middlewares/error.handler';
// import L from '../../common/logger';

const CardDecks = _.mapValues(CardDecksRaw.metadata, (value, abbr) => ({
  ...value,
  abbr,
  prompts: CardDecksRaw.black.filter((el) => el.deck === abbr),
  responses: CardDecksRaw.white.filter((el) => el.deck === abbr),
}));

export class GameService {
  getAvailablePacks(): PackInformation[] {
    return _.chain(CardDecks)
      .values()
      .map((el) =>
        _.chain(el)
          .merge({
            promptsCount: el.prompts.length,
            responsesCount: el.responses.length,
          })
          .omit(['prompts', 'responses'])
          .value()
      )
      .orderBy(['official', 'responsesCount'], ['desc', 'desc'])
      .value();
  }

  async initGameState(game: Partial<FullGame>): Promise<FullGameState> {
    const defaultGameState = {
      game: {
        packs: [],
        hasPassword: false,
        timeouts: {
          playing: 120,
          revealing: 60,
          judging: 120,
          betweenRounds: 30,
        },
        handSize: 10,
        winnerPoints: 20,
        specialRules: [],
      },
      players: [],
      rounds: [],
    };

    game.hasPassword = !!game.password;
    if (game.hasPassword) {
      assert(game.password);
      game.password = await bcrypt.hash(game.password, 10);
    }

    return _.merge(defaultGameState, { game }, { game: { id: uuidv4(), status: 'created' } });
  }

  async validateGamePassword(game: FullGame, password): Promise<void> {
    if (!game.password) {
      return;
    }
    assert(
      await bcrypt.compare(password, game.password),
      new HttpError('Game password incorrect', 403)
    );
  }

  initPlayer(player: Partial<Player>): FullPlayer {
    assert(player.nickname);
    const token = crypto.randomBytes(20).toString('hex');
    return _.merge(
      {
        nickname: '',
        points: 0,
        isAI: false,
        isActive: true,
        isHost: false,
        deck: [],
      },
      player,
      { id: uuidv4(), token }
    );
  }

  stripGame(game: FullGame): Game {
    return _.omit(game, ['password']);
  }

  stripGameState(gameState: FullGameState): GameState {
    const game = this.stripGame(gameState.game);
    const players = gameState.players.map((p: FullPlayer) => _.omit(p, ['deck', 'token']));
    return { game, players, rounds: gameState.rounds };
  }
}

export default new GameService();
