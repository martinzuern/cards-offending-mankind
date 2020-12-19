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
  ResponseCard,
  RoundSubmission,
} from '../../root-types';
import { HttpError } from '../api/middlewares/error.handler';

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

const packInformation: PackInformation[] = _.chain(CardDecks)
  .values()
  .map((el) =>
    _.chain(el)
      .cloneDeep()
      .merge({
        promptsCount: el.prompts.length,
        responsesCount: el.responses.length,
      })
      .omit(['prompts', 'responses'])
      .value()
  )
  .orderBy(['official', 'responsesCount'], ['desc', 'desc'])
  .value();

export default class GameService {
  static getAvailablePacks(): PackInformation[] {
    return packInformation;
  }

  static buildPile(game: InternalGame): Piles {
    const decks = game.packs.map((pack) => {
      const res = CardDecks[pack.abbr];
      assert(res, 'Invalid pack.');
      return res;
    });

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

  static refillHandForPlayers(
    gameState: InternalGameState,
    players: { id: string }[],
    handSize: number | undefined = undefined
  ): InternalGameState {
    const newGameState = _.cloneDeep(gameState);
    const round = _.last(newGameState.rounds);
    const handSizeParam = handSize ?? newGameState.game.handSize;
    assert(round, 'There are no rounds.');

    // If the round is not running, then no need to refill hands
    if (round.status !== RoundStatus.Created) return newGameState;

    const playerIds = players.map((p) => p.id);
    const newPlayers = newGameState.players.filter((p) => playerIds.includes(p.id));

    // Make sure we have enough cards left
    const roundHandSize = Math.max(round.prompt.pick, handSizeParam + round.prompt.draw - 1);
    if (newGameState.piles.responses.length < roundHandSize * newPlayers.length)
      newGameState.piles.responses = _.shuffle([
        ...newGameState.piles.responses,
        ...newGameState.piles.discardedResponses.splice(0),
      ]);

    newPlayers.forEach((player: InternalPlayer) => {
      if (player.deck.length >= roundHandSize) return;

      // eslint-disable-next-line no-param-reassign
      player.deck = [
        ...player.deck,
        ...newGameState.piles.responses.splice(0, roundHandSize - player.deck.length),
      ];
    });

    return newGameState;
  }

  static newRound(gameState: InternalGameState): InternalGameState {
    assert(
      gameState.rounds.every((r) => r.status === RoundStatus.Ended),
      'There are open rounds.'
    );

    let newGameState = _.cloneDeep(gameState);
    const activeHumanPlayers = newGameState.players.filter((p) => p.isActive && !p.isAI);

    if (!newGameState.piles.prompts.length)
      newGameState.piles.prompts = _.shuffle(newGameState.piles.discardedPrompts.splice(0));

    const newRound: Round = {
      judgeId: activeHumanPlayers[newGameState.rounds.length % activeHumanPlayers.length].id,
      status: RoundStatus.Created,
      timeouts: {
        playing: new Date(_.now() + newGameState.game.timeouts.playing * 1000),
      },
      prompt: newGameState.piles.prompts.shift(),
      submissions: [],
      discard: [],
    };
    newGameState.rounds.push(newRound);

    newGameState = this.refillHandForPlayers(newGameState, activeHumanPlayers);

    // Handling AI Players
    const aiPlayers = newGameState.players.filter((p) => p.isAI);
    newGameState = this.refillHandForPlayers(newGameState, aiPlayers, 0);
    newGameState.players
      .filter((p) => p.isAI)
      .forEach((aiPlayer) => {
        const newSubmission: RoundSubmission = {
          playerId: aiPlayer.id,
          timestamp: new Date(),
          cards: aiPlayer.deck.splice(0),
          pointsChange: 0,
          isRevealed: false,
        };
        _.last(newGameState.rounds).submissions.push(newSubmission);
      });

    return newGameState;
  }

  static startGame(gameState: InternalGameState): InternalGameState {
    const newGameState = _.cloneDeep(gameState);
    assert(this.isGameJoinable(newGameState.game), 'Game has wrong status.');
    const activeHumanPlayers = newGameState.players.filter(
      (player) => player.isActive && !player.isAI
    );
    const aiPlayers = newGameState.players.filter((player) => player.isAI);
    assert(activeHumanPlayers.length >= 2, 'There are not enough human players.');
    assert(activeHumanPlayers.length + aiPlayers.length >= 3, 'There are not enough players.');

    newGameState.piles = GameService.buildPile(newGameState.game);
    assert(newGameState.piles.prompts.length > 1, 'There are not enough packs.');
    const maxHandSize =
      newGameState.game.handSize + Math.max(...newGameState.piles.prompts.map((p) => p.draw)) - 1;
    assert(
      newGameState.piles.responses.length >
        activeHumanPlayers.length * maxHandSize + aiPlayers.length,
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
          specialRules: {
            aiPlayerCount: 0,
          },
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
      result.game.password = await bcrypt.hash(game.password, 10);
    }

    result.game.packs = result.game.packs.map(
      ({ abbr }): Pack => {
        const res = CardDecks[abbr];
        assert(res, `Invalid pack ${abbr}.`);
        return _.omit(res, ['prompts', 'responses']);
      }
    );

    _.take(
      ['Rando Cardrissian', 'Robi-Wan Cardnobi', 'Cardbacca'],
      game.specialRules.aiPlayerCount
    ).forEach((nickname) => {
      const p = this.initPlayer(uuidv4() as UUID, { nickname, isAI: true, isActive: true });
      result.players.push(p);
    });

    return result;
  }

  static async validateGamePassword(game: InternalGame, password: string): Promise<boolean> {
    if (!game.hasPassword) return true;

    assert(_.isString(password), new HttpError('Game password not provided.', 403));
    const valid = await bcrypt.compare(password, game.password);
    assert(valid === true, new HttpError('Game password incorrect', 403));
    return valid;
  }

  static initPlayer(gameId: UUID, player: Partial<Player>): PlayerWithToken {
    assert(player.nickname, 'No nickname given.');
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

  static pickCards(
    gameState: InternalGameState,
    roundIndex: number,
    playerId: UUID,
    pickedCards: ResponseCard[]
  ): InternalGameState {
    const round = gameState.rounds[roundIndex];
    assert(round.status === RoundStatus.Created, 'Incorrect round status.');
    assert(round.judgeId !== playerId, 'Judge cannot pick cards.');
    assert(
      round.submissions.every((s) => s.playerId !== playerId),
      'Player already picked cards.'
    );
    const myPlayer = _.find(gameState.players, {
      id: playerId,
      isActive: true,
    }) as InternalPlayer;
    assert(myPlayer, 'Could not find player.');

    const cards = pickedCards.map((card) => {
      const found = _.find(myPlayer.deck, card);
      assert(found, 'Invalid card');
      myPlayer.deck = _.without(myPlayer.deck, found);
      return found;
    });
    assert(cards.length === round.prompt.pick, 'Incorrect number of cards.');

    const newSubmission: RoundSubmission = {
      playerId,
      timestamp: new Date(),
      cards,
      pointsChange: 0,
      isRevealed: false,
    };
    round.submissions.push(newSubmission);

    return gameState;
  }

  static playRound(prevGameState: InternalGameState, roundIndex: number): InternalGameState {
    const gameState = _.cloneDeep(prevGameState);
    const round = gameState.rounds[roundIndex];
    const now = new Date();
    assert(round.status === RoundStatus.Created, 'Round already past picking.');

    if (round.submissions.length === 0) {
      round.status = RoundStatus.Ended;
      round.timeouts = {
        playing: now,
        revealing: now,
        judging: now,
        betweenRounds: new Date(now.getTime() + prevGameState.game.timeouts.betweenRounds * 1000),
      };
    } else {
      round.status = RoundStatus.Played;
      round.submissions = _.shuffle(round.submissions);
      round.timeouts = {
        playing: now,
        revealing: new Date(now.getTime() + prevGameState.game.timeouts.revealing * 1000),
      };
    }
    return gameState;
  }

  static revealRound(prevGameState: InternalGameState, roundIndex: number): InternalGameState {
    const gameState = _.cloneDeep(prevGameState);
    const round = gameState.rounds[roundIndex];
    const now = new Date();
    assert(round.status === RoundStatus.Played, 'Round has invalid status.');

    round.status = RoundStatus.Revealed;
    round.timeouts = {
      ...round.timeouts,
      revealing: now,
      judging: new Date(now.getTime() + prevGameState.game.timeouts.judging * 1000),
    };
    round.submissions = round.submissions.map((s) => ({ ...s, isRevealed: true }));
    return gameState;
  }

  static endRound(prevGameState: InternalGameState, roundIndex: number): InternalGameState {
    const gameState = _.cloneDeep(prevGameState);
    const round = gameState.rounds[roundIndex];
    assert(round.status !== RoundStatus.Ended, 'Round has invalid status.');

    gameState.players = gameState.players.map((player) => {
      const change = _.chain(round.submissions)
        .concat(round.discard)
        .filter((s) => s.playerId === player.id)
        .reduce((sum, s) => sum + s.pointsChange, 0)
        .value();
      return { ...player, points: player.points + change };
    });

    const now = new Date();
    round.status = RoundStatus.Ended;
    round.timeouts = {
      ...round.timeouts,
      judging: now,
      betweenRounds: new Date(now.getTime() + prevGameState.game.timeouts.betweenRounds * 1000),
    };

    return gameState;
  }

  static chooseWinner(round: Round, submissionIndex: number): Round {
    assert(round.status === RoundStatus.Revealed, 'Incorrect round status.');
    const submission = round.submissions[submissionIndex];
    assert(submission, 'Submission not found.');
    submission.pointsChange = 1;
    return round;
  }

  static revealSubmission(round: Round, submissionIndex: number): Round {
    assert(round.status === RoundStatus.Played, 'Incorrect round status.');
    const submission = round.submissions[submissionIndex];
    assert(submission, 'Submission not found.');
    assert(submission.isRevealed === false, 'Submission already revealed.');
    submission.isRevealed = true;
    return round;
  }

  static updatePlayer(
    gameState: InternalGameState,
    playerId: string,
    data: Partial<InternalPlayer>
  ): InternalGameState {
    return {
      ...gameState,
      players: gameState.players.map((player: InternalPlayer) =>
        playerId !== player.id ? player : { ...player, ...data }
      ),
    };
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

  static stripGame(game: InternalGame): Game {
    return _.omit(game, ['password']);
  }

  static stripRound(round: Round): Round {
    if (round.status === RoundStatus.Ended) return round;

    const submissions = round.submissions.map((s) => {
      const cards = s.isRevealed ? s.cards : s.cards.map((c) => ({ ...c, value: '***' }));
      const playerId = '00000000-0000-0000-0000-000000000000' as UUID;
      return { ...s, cards, playerId };
    });

    return { ...round, submissions };
  }

  static stripGameState(gameState: InternalGameState): GameState {
    const game = this.stripGame(gameState.game);
    const players: OtherPlayer[] = gameState.players.map((p: InternalPlayer) =>
      _.omit(p, ['deck', 'socketId'])
    );
    const rounds = gameState.rounds.map(this.stripRound);
    return { game, players, rounds };
  }
}
