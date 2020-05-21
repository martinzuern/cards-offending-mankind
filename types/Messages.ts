import { ResponseCard } from './Cards';

export interface MessagePickCards {
  roundIndex: number;
  cards: ResponseCard[];
}

export interface MessageRevealSubmission {
  roundIndex: number;
  submissionIndex: number;
}

export interface MessageChooseWinner {
  roundIndex: number;
  submissionIndex: number;
}
