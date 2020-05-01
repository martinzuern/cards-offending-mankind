import { Request, Response } from 'express';
import assert from 'assert';

import GameService from '../../services/game.service';
import DBService from '../../services/db.service';

export class Controller {
  async createGame(req: Request, res: Response): Promise<void> {
    const { game, player } = req.body;

    const newGame = await GameService.initGameState(game);
    const newPlayer = GameService.initPlayer({
      nickname: player.nickname,
      isHost: true,
    });
    newGame.players.push(newPlayer);

    await DBService.writeGame(newGame);

    res.status(201).json({
      game: GameService.stripGame(newGame.game),
      player: newPlayer,
    });
  }

  async joinGame(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { password, nickname } = req.body;
    assert(id);
    assert(nickname);

    let newPlayer;
    await DBService.updateGame(id, async (gameState) => {
      await GameService.validateGamePassword(gameState.game, password);
      newPlayer = GameService.initPlayer({ nickname });
      gameState.players.push(newPlayer);
      return gameState;
    });

    res.json({ player: newPlayer });
  }
}
export default new Controller();
