// TODO
export type Uuid = string & { readonly _: unique symbol };

export interface GameState {
  game: Game;
  players: Player[];
  rounds: Round[];
}

export type FullGameState = GameState & {
  piles: Piles;
};

export type PackId = string;
export type PackDescription = string;

export enum GameStatus {
  Created = 'created',
  Running = 'running',
  Ended = 'ended',
}

export interface Game {
  id: Uuid;
  requiresPassword: boolean;
  status: GameStatus;
  packs: Record<PackId, PackDescription>;
  timeouts: {
    playing: number;
    revealing: number;
    judging: number;
    betweenRounds: number;
  };
  rules: {
    handSize: number;
    winnerPoints: number;
    randoCardrissianPlayers: number;
    comedyWriter: number;
  };
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
  pack: PackId;
}

export interface ResponseCard {
  type: CardType;
  value: string;
  pack: PackId;
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
};

export enum RoundStatus {
  Created = 'created',
  Played = 'played',
  Revealed = 'revealed',
  Ended = 'ended',
}

export interface Round {
  judge: Player['id'];
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
  player: Player['id'];
  timestamp: Date;
  cards: ResponseCard[];
  pointsChange: number;
  isRevealed: boolean;
}
