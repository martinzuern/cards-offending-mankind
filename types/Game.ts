import { UUID } from './common';
import { Pack, PromptCard, ResponseCard } from './Cards';
import { OtherPlayer, Player } from './Player';

export enum GameStatus {
  Created = 'created',
  Running = 'running',
  Ended = 'ended',
}

// type SpecialRuleRandoCardrissio = {
//   type: 'RandoCardrissio';
//   players: number;
// };

// type SpecialRuleComdeyWriter = {
//   type: 'ComdeyWriter';
//   allCards: boolean;
//   numberOfCards: number;
// };

// export type SpecialRule = SpecialRuleRandoCardrissio | SpecialRuleComdeyWriter;

export interface Game {
  id: UUID;
  hasPassword: boolean;
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
  // We don't support specialRules yet
  // specialRules: SpecialRule[];
}

export interface CreateGame extends Game {
  password?: string;
}

export enum RoundStatus {
  Created = 'created',
  Played = 'played',
  Revealed = 'revealed',
  Ended = 'ended',
}

type timeouts = {
  playing: Date;
  revealing: Date;
  judging: Date;
  betweenRounds: Date;
};

export interface RoundSubmission {
  playerId: Player['id'];
  timestamp: Date;
  cards: ResponseCard[];
  pointsChange: number;
  isRevealed: boolean;
}

export interface Round {
  judgeId: Player['id'];
  status: RoundStatus;
  timeouts:
    | Pick<timeouts, 'playing'>
    | Pick<timeouts, 'playing' | 'revealing'>
    | Pick<timeouts, 'playing' | 'revealing' | 'judging'>
    | timeouts;
  prompt: PromptCard;
  submissions: RoundSubmission[];
  discard: RoundSubmission[];
}

export interface GameState {
  game: Game;
  players: OtherPlayer[];
  rounds: Round[];
}
