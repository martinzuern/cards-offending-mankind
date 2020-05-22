import { UUID } from './common';
import { ResponseCard } from './Cards';

export interface Player {
  id: UUID;
  nickname: string;
  points: number;
  isAI: boolean;
  isActive: boolean;
  isHost: boolean;
  deck: ResponseCard[];
}

export interface PlayerWithToken extends Player {
  token: string;
}

export type OtherPlayer = Omit<Player, 'deck'>;

export type CreatePlayer = Pick<Player, 'nickname'>;
