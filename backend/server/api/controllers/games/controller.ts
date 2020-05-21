import { Request, Response } from 'express';
import assert from 'assert';
import _ from 'lodash';

import GameService from '../../../services/game.service';
import DBService from '../../../services/db.service';
import { HttpError } from '../../middlewares/error.handler';
import { PlayerWithToken } from '../../../../root-types';
// import L from '../../../common/logger';

export default class Controller {
  static async createGame(req: Request, res: Response): Promise<void> {
    const { game, player } = req.body;

    const newGame = await GameService.initGameState(game);
    const newPlayer = GameService.initPlayer(newGame.game.id, {
      nickname: player.nickname,
      isHost: true,
    });
    newGame.players.push(_.omit(newPlayer, ['token']));

    await DBService.writeGame(newGame, true);

    res.status(201).json({
      game: GameService.stripGame(newGame.game),
      player: newPlayer,
    });
  }

  static async joinGame(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { password, nickname } = req.body;
    assert(id);
    assert(nickname);

    let newPlayer: PlayerWithToken;
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
      gameState.players.push(_.omit(newPlayer, ['token']));
      return gameState;
    });

    res.json({ player: newPlayer });
  }

  static async byId(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    assert(id);

    const game = await DBService.getGame(id);

    res.json({
      game: GameService.stripGame(game.game),
    });
  }
}
