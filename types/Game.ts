import { UUID } from './common';
import { Pack, PromptCard, ResponseCard } from './Cards';
import { OtherPlayer, Player } from './Player';

export enum GameStatus {
  Created = 'created',
  Running = 'running',
  Ended = 'ended',
}

export interface Game {
  id: UUID;
  hasPassword: boolean;
  status: GameStatus;
  packs: Pack[];
  handSize: number;
  winnerPoints: number | false;
  timeouts: {
    playing: number;
    revealing: number;
    judging: number;
    betweenRounds: number;
  };
  specialRules: {
    aiPlayerCount: 0 | 1 | 2 | 3;
    allowDiscarding: {
      enabled: boolean;
      penalty: number;
    };
  };
}

export interface CreateGame extends Partial<Omit<Game, 'id' | 'status' | 'hasPassword' | 'packs'>> {
  password?: string;
  packs: (Pack | Pick<Pack, 'abbr'>)[];
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

export type RoundTimeoutKeys = keyof timeouts;

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
