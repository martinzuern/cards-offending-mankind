import { ResponseCard } from './Cards';
import { Round, Game, CreateGame } from './Game';
import { PlayerWithToken, CreatePlayer } from '.';

export interface MessageCreateGame {
  game: CreateGame;
  player: CreatePlayer;
}
export interface MessageGameCreated {
  game: Game;
  player: PlayerWithToken;
}

export interface MessageJoinGame extends CreatePlayer {
  password?: string;
}
export interface MessagePlayerJoined {
  player: PlayerWithToken;
}
export interface MessageGetGame {
  game: Game;
}

export interface MessagePickCards {
  roundIndex: number;
  cards: ResponseCard[];
}

export interface MessageDiscardPrompt {
  roundIndex: number;
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
