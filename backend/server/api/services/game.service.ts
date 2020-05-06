import _ from 'lodash';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
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
  PlayerJwt,
  FullPlayerWithToken,
} from '../../../root-types';
import { HttpError } from '../middlewares/error.handler';
// import L from '../../common/logger';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = '24h';

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

  async validateGamePassword(game: FullGame, password: string): Promise<void> {
    if (!game.password) {
      return;
    }
    assert(password, new HttpError('Game password not provided.', 403));
    assert(
      await bcrypt.compare(password, game.password),
      new HttpError('Game password incorrect', 403)
    );
  }

  initPlayer(gameId: string, player: Partial<Player>): FullPlayerWithToken {
    assert(player.nickname);
    const id = uuidv4();
    const tokenPayload: PlayerJwt = { id, gameId };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
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
      { id, token }
    );
  }

  stripGame(game: FullGame): Game {
    return _.omit(game, ['password']);
  }

  isGameJoinable(game: FullGame): boolean {
    return game.status === 'created';
  }

  stripGameState(gameState: FullGameState): GameState {
    const game = this.stripGame(gameState.game);
    const players: Player[] = gameState.players.map((p: FullPlayer) => _.omit(p, ['deck']));
    return { game, players, rounds: gameState.rounds };
  }
}

export default new GameService();
