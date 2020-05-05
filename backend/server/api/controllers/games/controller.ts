import { Request, Response } from 'express';
import assert from 'assert';

import GameService from '../../services/game.service';
import DBService from '../../services/db.service';
import { HttpError } from '../../middlewares/error.handler';
// import L from '../../../common/logger';

export class Controller {
  async createGame(req: Request, res: Response): Promise<void> {
    const { game, player } = req.body;

    const newGame = await GameService.initGameState(game);
    const newPlayer = GameService.initPlayer(newGame.game.id, {
      nickname: player.nickname,
      isHost: true,
    });
    newGame.players.push(newPlayer);

    await DBService.writeGame(newGame, true);

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
      assert(
        GameService.isGameJoinable(gameState.game),
        new HttpError('Players can only join in status "created".', 400)
      );
      assert(
        gameState.players.every((p) => p.nickname !== nickname),
        new HttpError('Nickname already taken', 400)
      );
      newPlayer = GameService.initPlayer(id, { nickname });
      gameState.players.push(newPlayer);
      return gameState;
    });

    res.json({ player: newPlayer });
  }

  async byId(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    assert(id);

    const game = await DBService.getGame(id);

    res.json({
      game: GameService.stripGame(game.game),
    });
  }
}
export default new Controller();
