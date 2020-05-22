import _ from 'lodash';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import CardDecksRaw from 'json-against-humanity/full.md.json';

import {
  InternalGameState,
  Player,
  InternalPlayer,
  GameState,
  Game,
  PackInformation,
  PlayerJWT,
  Piles,
  Pack,
  CardType,
  Round,
  GameStatus,
  RoundStatus,
  PlayerWithToken,
  InternalGame,
  CreateGame,
  OtherPlayer,
  UUID,
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

  static buildPile(game: InternalGame): Piles {
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

  static newRound(gameState: InternalGameState): InternalGameState {
    assert(
      gameState.rounds.every((r) => r.status === RoundStatus.Ended),
      'There are open rounds.'
    );

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

    newGameState.players = newGameState.players.map((player: InternalPlayer) => {
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

  static startGame(gameState: InternalGameState): InternalGameState {
    const newGameState = _.cloneDeep(gameState);
    assert(this.isGameJoinable(newGameState.game), 'Game has wrong status.');
    const activePlayers = newGameState.players.filter((player) => player.isActive);
    assert(activePlayers.length >= 3, 'There are not enough players.');

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

  static endGame(gameState: InternalGameState): InternalGameState {
    const newGameState = _.cloneDeep(gameState);

    newGameState.game.status = GameStatus.Ended;
    newGameState.rounds = newGameState.rounds.map((r) => ({ ...r, status: RoundStatus.Ended }));

    return newGameState;
  }

  static async initGameState(game: Partial<CreateGame>): Promise<InternalGameState> {
    const result: InternalGameState = {
      game: _.merge(
        {
          packs: [],
          timeouts: {
            playing: 120,
            revealing: 60,
            judging: 120,
            betweenRounds: 30,
          },
          handSize: 10,
          winnerPoints: 20,
        },
        game,
        {
          id: uuidv4() as UUID,
          status: GameStatus.Created,
          hasPassword: !!game.password,
        }
      ),
      players: [],
      rounds: [],
    };

    if (result.game.hasPassword) {
      assert(game.password);
      result.game.password = await bcrypt.hash(game.password, 10);
    }

    result.game.packs = result.game.packs.map(
      ({ abbr }): Pack => {
        const res = _.get(CardDecks, abbr);
        assert(res, `Invalid pack ${abbr}.`);
        return _.omit(res, ['prompts', 'responses']);
      }
    );

    return result;
  }

  static async validateGamePassword(game: InternalGame, password: string): Promise<void> {
    if (!game.hasPassword) return;

    assert(password, new HttpError('Game password not provided.', 403));
    assert(
      await bcrypt.compare(password, game.password),
      new HttpError('Game password incorrect', 403)
    );
  }

  static initPlayer(gameId: string, player: Partial<Player>): PlayerWithToken {
    assert(player.nickname);
    const id = uuidv4() as UUID;
    const tokenPayload: PlayerJWT = { id, gameId };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
    return _.merge(
      {
        nickname: '',
        points: 0,
        isAI: false,
        isActive: false,
        isHost: false,
      },
      player,
      { id, token, deck: [] }
    );
  }

  static stripGame(game: InternalGame): Game {
    return _.omit(game, ['password']);
  }

  static isGameJoinable(game: InternalGame): boolean {
    return game.status === GameStatus.Created;
  }

  static isGameRunning(game: InternalGame): boolean {
    return game.status === GameStatus.Running;
  }

  static isHost(gameState: InternalGameState, playerId: string): boolean {
    const player = gameState.players.find((p) => p.id === playerId);
    return !!player?.isHost;
  }

  static stripGameState(gameState: InternalGameState): GameState {
    const game = this.stripGame(gameState.game);

    const players: OtherPlayer[] = gameState.players.map((p: InternalPlayer) =>
      _.omit(p, ['deck', 'socketId'])
    );

    // Strip card details if they are not revealed
    const rounds = gameState.rounds.map((r: Round) => {
      if (r.status === RoundStatus.Ended) return r;
      const submissions = r.submissions.map((s) => {
        if (s.isRevealed) return s;
        const cards = s.cards.map((c) => ({ ...c, value: '***' }));
        return { ...s, cards };
      });
      return { ...r, submissions };
    });

    return { game, players, rounds };
  }
}
