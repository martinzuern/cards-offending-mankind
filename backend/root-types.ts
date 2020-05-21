/* eslint-disable spaced-comment */
/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../types/index.ts" />

import { GameState, CreateGame, PromptCard, ResponseCard, Player } from '../types';

export * from '../types';

export type PlayerJWT = {
  id: string;
  gameId: string;
};

export type InternalGame = CreateGame;

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
