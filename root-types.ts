// TODO
export type Uuid = string & { readonly _: unique symbol };

export interface GameState {
  game: Game;
  piles: Piles;
  players: Player[];
  rounds: Round[];
}

export type PackId = string;
export type PackDescription = string;

export interface Game {
  id: Uuid;
  requiresPassword: boolean;
  status: 'created' | 'running' | 'ended';
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
  black: BlackCard[];
  white: WhiteCard[];
  discardedBlack: BlackCard[];
  discardedWhite: WhiteCard[];
}

export enum CardType {
  Blank = 'blank',
  Text = 'text',
}

export interface BlackCard {
  type: CardType;
  value: string;
  draw: number;
  pick: number;
  pack: PackId;
}

export interface WhiteCard {
  type: CardType;
  value: string;
  pack: PackId;
}

export interface Player {
  id: Uuid;
  isAI: boolean;
  nickname: string;
  deck: WhiteCard[];
  points: number;
  isHost: boolean;
}

export interface Round {
  judge: Player['id'];
  status: 'started' | 'played' | 'revealed' | 'ended';
  timeouts: {
    playing: Date;
    revealing?: Date;
    judging?: Date;
    betweenRounds?: Date;
  };
  challenge: BlackCard;
  submissions: RoundSubmission[];
  discard: RoundSubmission[];
}

export interface RoundSubmission {
  player: Player['id'];
  timestamp: Date;
  cards: WhiteCard[];
  pointsChange: number;
  isRevealed: boolean;
}
