import { ResponseCard } from './Cards';
import { Round } from './Game';

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

export interface MessageRoundUpdated {
  roundIndex: number;
  round: Round;
}
