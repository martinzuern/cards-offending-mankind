import _ from 'lodash';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import CardDecks from 'json-against-humanity/full.md.json';

import {
  FullGameState,
  Pack,
  FullGame,
  Player,
  FullPlayer,
  GameState,
  Game,
} from '../../../root-types';
import L from '../../common/logger';

export class GameService {
  getAvailablePacks(): Pack[] {
    return Object.entries(CardDecks.metadata).map(([abbr, entry]) => ({
      ...entry,
      abbr,
    }));
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

    return _.merge(
      defaultGameState,
      { game },
      { game: { id: uuidv4(), status: 'created' } }
    );
  }

  async validateGamePassword(game: FullGame, password) {
    if (!game.password) {
      return;
    }
    assert(await bcrypt.compare(password, game.password));
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
    const players = gameState.players.map((p: FullPlayer) =>
      _.omit(p, ['deck', 'token'])
    );
    return { game, players, rounds: gameState.rounds };
  }
}

export default new GameService();
