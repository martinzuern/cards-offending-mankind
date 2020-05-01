// TODO
export type Uuid = string & { readonly _: unique symbol };

export interface GameState {
  game: Game;
  players: Player[];
  rounds: Round[];
}

export type FullGameState = GameState & {
  piles: Piles;
  players: FullPlayer[];
};

export type Pack = {
  abbr: string;
  name: string;
  icon: string;
  description: string;
  official: boolean;
};

export enum GameStatus {
  Created = 'created',
  Running = 'running',
  Ended = 'ended',
}

type SpecialRuleRandoCardrissio = {
  type: 'RandoCardrissio';
  players: number;
};

type SpecialRuleComdeyWriter = {
  type: 'ComdeyWriter';
  allCards: boolean;
  numberOfCards: number;
};

export type SpecialRule = SpecialRuleRandoCardrissio | SpecialRuleComdeyWriter;

export interface Game {
  id: Uuid;
  requiresPassword: boolean;
  status: GameStatus;
  packs: Pack[];
  timeouts: {
    playing: number;
    revealing: number;
    judging: number;
    betweenRounds: number;
  };
  handSize: number;
  winnerPoints: number | false;
  specialRules: SpecialRule[];
}

export interface Piles {
  prompts: PromptCard[];
  responses: ResponseCard[];
  discardedPrompts: PromptCard[];
  discardedResponses: ResponseCard[];
}

export enum CardType {
  Blank = 'blank',
  Text = 'text',
}

export interface PromptCard {
  type: CardType;
  value: string;
  draw: number;
  pick: number;
  packAbbr: Pack['abbr'];
}

export interface ResponseCard {
  type: CardType;
  value: string;
  packAbbr: Pack['abbr'];
}

export interface Player {
  id: Uuid;
  nickname: string;
  points: number;
  isAI: boolean;
  isActive: boolean;
  isHost: boolean;
}

export type FullPlayer = Player & {
  deck: ResponseCard[];
  token: string;
};

export enum RoundStatus {
  Created = 'created',
  Played = 'played',
  Revealed = 'revealed',
  Ended = 'ended',
}

export interface Round {
  judgeId: Player['id'];
  status: RoundStatus;
  timeouts: {
    playing: Date;
    revealing?: Date;
    judging?: Date;
    betweenRounds?: Date;
  };
  prompt: PromptCard;
  submissions: RoundSubmission[];
  discard: RoundSubmission[];
}

export interface RoundSubmission {
  playerId: Player['id'];
  timestamp: Date;
  cards: ResponseCard[];
  pointsChange: number;
  isRevealed: boolean;
}
