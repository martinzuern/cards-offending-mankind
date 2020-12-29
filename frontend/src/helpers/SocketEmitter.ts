import { MessageChooseWinner, MessageDiscardPrompt, MessagePickCards, MessageRevealSubmission } from '@/types';

export default class SocketEmitter {
  socket: SocketIOClient.Socket;

  constructor(socket: SocketIOClient.Socket) {
    this.socket = socket;
  }

  startGame(): void {
    this.socket.emit('start_game');
  }

  pickCards(data: MessagePickCards): void {
    this.socket.emit('pick_cards', data);
  }

  discardCards(data: MessagePickCards): void {
    this.socket.emit('discard_cards', data);
  }

  discardPrompt(data: MessageDiscardPrompt): void {
    this.socket.emit('discard_prompt', data);
  }

  revealSubmission(data: MessageRevealSubmission): void {
    this.socket.emit('reveal_submission', data);
  }

  chooseWinner(data: MessageChooseWinner): void {
    this.socket.emit('choose_winner', data);
  }

  startNextRound(): void {
    this.socket.emit('start_next_round');
  }

  endGame(): void {
    this.socket.emit('end_game');
  }
}
