/* eslint-disable spaced-comment */
/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../types/index.ts" />

import { GameState, PromptCard, ResponseCard, Player, Game, UUID } from '../types';

export * from '../types';

export type PlayerJWT = {
  id: UUID;
  gameId: UUID;
};

export type Deck = {
  abbr: string;
  official: boolean;
  name: string;
  prompts: {
    text: string;
    pick: number;
  }[];
  responses: {
    text: string;
  }[];
};
export interface InternalGame extends Game {
  password?: string;
}

export interface Piles {
  prompts: PromptCard[];
  responses: ResponseCard[];
  discardedPrompts: PromptCard[];
  discardedResponses: ResponseCard[];
}

export interface InternalPlayer extends Player {
  socketId?: string;
}

export interface InternalGameState extends GameState {
  game: InternalGame;
  piles?: Piles;
  players: InternalPlayer[];
}
