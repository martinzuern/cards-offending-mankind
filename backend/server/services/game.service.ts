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
  Piles,
  Pack,
  CardType,
  Round,
  GameStatus,
  RoundStatus,
} from '../../root-types';
import { HttpError } from '../api/middlewares/error.handler';
// import L from '../../common/logger';

const { JWT_SECRET } = process.env;
const JWT_EXPIRATION = '24h';

type Deck = {
  abbr: string;
  prompts: {
    text: string;
    deck: string;
    icon: string;
    pick: number;
  }[];
  responses: {
    text: string;
    icon: string;
    deck: string;
  }[];
  description: string;
  official: boolean;
  name: string;
  icon: string;
};

const CardDecks: Record<string, Deck> = _.mapValues(CardDecksRaw.metadata, (value, abbr) => ({
  ...value,
  abbr,
  prompts: CardDecksRaw.black.filter((el) => el.deck === abbr),
  responses: CardDecksRaw.white.filter((el) => el.deck === abbr),
}));

export default class GameService {
  static getAvailablePacks(): PackInformation[] {
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

  static buildPile(game: FullGame): Piles {
    const decks = game.packs.map((pack) => _.get(CardDecks, pack.abbr));
    const prompts = _.chain(decks)
      .map((deck): Piles['prompts'] =>
        deck.prompts.map((prompt) => ({
          type: CardType.Text,
          value: prompt.text,
          pick: prompt.pick,
          draw: Math.max(prompt.pick - 1, 1),
          packAbbr: deck.abbr,
        }))
      )
      .flatten()
      .shuffle()
      .value();
    const responses = _.chain(decks)
      .map((deck): Piles['responses'] =>
        deck.responses.map((response) => ({
          type: CardType.Text,
          value: response.text,
          packAbbr: deck.abbr,
        }))
      )
      .flatten()
      .shuffle()
      .value();

    return {
      prompts,
      responses,
      discardedPrompts: [],
      discardedResponses: [],
    };
  }

  static newRound(gameState: FullGameState): FullGameState {
    const newGameState = _.cloneDeep(gameState);
    const activePlayers = newGameState.players.filter((player) => player.isActive);

    if (!newGameState.piles.prompts.length)
      newGameState.piles.prompts = _.shuffle(newGameState.piles.discardedPrompts.splice(0));

    const newRound: Round = {
      judgeId: activePlayers[newGameState.rounds.length % activePlayers.length].id,
      status: RoundStatus.Created,
      timeouts: {
        playing: new Date(_.now() + newGameState.game.timeouts.playing),
      },
      prompt: newGameState.piles.prompts.shift(),
      submissions: [],
      discard: [],
    };

    // Refill hand
    const handSize = newGameState.game.handSize + newRound.prompt.draw - 1;
    if (newGameState.piles.responses.length < handSize * activePlayers.length)
      newGameState.piles.responses = _.shuffle([
        ...newGameState.piles.responses,
        ...newGameState.piles.discardedResponses.splice(0),
      ]);

    newGameState.players = newGameState.players.map((player: FullPlayer) => {
      if (!player.isActive || player.deck.length >= handSize) return player;
      return {
        ...player,
        deck: [
          ...player.deck,
          ...newGameState.piles.responses.splice(0, handSize - player.deck.length),
        ],
      };
    });

    newGameState.rounds.push(newRound);
    return newGameState;
  }

  static startGame(gameState: FullGameState): FullGameState {
    const newGameState = _.cloneDeep(gameState);
    assert(this.isGameJoinable(newGameState.game), 'Game has wrong status.');
    const activePlayers = newGameState.players.filter((player) => player.isActive);
    assert(activePlayers.length > 1, 'There are not enough players.');

    newGameState.piles = GameService.buildPile(newGameState.game);
    assert(newGameState.piles.prompts.length > 1, 'There are not enough packs.');
    const maxHandSize =
      newGameState.game.handSize + Math.max(...newGameState.piles.prompts.map((p) => p.draw)) - 1;
    assert(
      newGameState.piles.responses.length > activePlayers.length * maxHandSize,
      'There are not enough packs.'
    );

    newGameState.players = _.shuffle(newGameState.players);
    newGameState.game.status = GameStatus.Running;

    return this.newRound(newGameState);
  }

  static async initGameState(game: Partial<FullGame>): Promise<FullGameState> {
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

    const hasPassword = !!game.password;
    let password;
    if (hasPassword) {
      assert(game.password);
      password = await bcrypt.hash(game.password, 10);
    }

    const result = _.merge(
      defaultGameState,
      { game },
      { game: { id: uuidv4(), hasPassword, password, status: 'created' } }
    );

    result.game.packs = result.game.packs.map(
      (el: string | Pack): Pack => {
        const res = _.get(CardDecks, _.isString(el) ? el : el.abbr);
        assert(res, 'Invalid pack.');
        return _.omit(res, ['prompts', 'responses']);
      }
    );

    return result;
  }

  static async validateGamePassword(game: FullGame, password: string): Promise<void> {
    if (!game.password) {
      return;
    }
    assert(password, new HttpError('Game password not provided.', 403));
    assert(
      await bcrypt.compare(password, game.password),
      new HttpError('Game password incorrect', 403)
    );
  }

  static initPlayer(gameId: string, player: Partial<Player>): FullPlayerWithToken {
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

  static stripGame(game: FullGame): Game {
    return _.omit(game, ['password']);
  }

  static isGameJoinable(game: FullGame): boolean {
    return game.status === 'created';
  }

  static isHost(gameState: FullGameState, playerId: string): boolean {
    const player = gameState.players.find((p) => p.id === playerId);
    return !!player?.isHost;
  }

  static stripGameState(gameState: FullGameState): GameState {
    const game = this.stripGame(gameState.game);
    const players: Player[] = gameState.players.map((p: FullPlayer) =>
      _.omit(p, ['deck', 'socketId'])
    );
    return { game, players, rounds: gameState.rounds };
  }
}
