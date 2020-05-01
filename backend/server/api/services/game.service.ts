import _ from 'lodash';
import bcrypt from 'bcrypt';
import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import CardDecks from 'json-against-humanity/full.md.json';

import { GameState, Pack, Game } from '../../../root-types';
import L from '../../common/logger';

export class GameService {
  getAvailableDecks(): Pack[] {
    return Object.entries(CardDecks.metadata).map(([abbr, entry]) => ({
      ...entry,
      abbr,
    }));
  }

  async initGameState(game: Partial<Game>): Promise<GameState> {
    const defaultGameState = {
      game: {
        packs: [],
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

    if (game.password) {
      game.password = await bcrypt.hash(game.password, 10);
    }

    return _.merge(
      defaultGameState,
      { game },
      { game: { id: uuidv4(), status: 'created' } }
    );
  }

  async validateGamePassword(game: Game, password) {
    if (!game.password) { return }
    assert(await bcrypt.compare(password, game.password));
  }
}

export default new GameService();
