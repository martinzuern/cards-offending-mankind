import { Request, Response } from 'express';
import assert from 'assert';
import _ from 'lodash';

import GameService from '../../../services/game.service';
import DBService from '../../../services/db.service';
import { HttpError } from '../../middlewares/error.handler';
import {
  PlayerWithToken,
  UUID,
  MessageGameCreated,
  MessagePlayerJoined,
  MessageGetGame,
} from '../../../../root-types';
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

    const out: MessageGameCreated = {
      game: GameService.stripGame(newGame.game),
      player: newPlayer,
    };
    res.status(201).json(out);
  }

  static async joinGame(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { password, nickname } = req.body;
    assert(id);
    assert(nickname);

    let newPlayer: PlayerWithToken;
    await DBService.updateGame(id, async (gameState) => {
      await GameService.validateGamePassword(gameState.game, password);
      if (!GameService.isGameJoinable(gameState.game))
        throw new HttpError('Players cannot join if game has ended.', 400);
      if (gameState.players.some((p) => p.nickname === nickname))
        throw new HttpError('Nickname already taken.', 400);
      if (
        GameService.isGameRunning(gameState.game) &&
        !GameService.validateEnoughPacks(gameState, 1)
      )
        throw new HttpError('There are not enough packs for an extra player.', 400);
      newPlayer = GameService.initPlayer(id as UUID, { nickname });
      gameState.players.push(_.omit(newPlayer, ['token']));
      return gameState;
    });

    const out: MessagePlayerJoined = { player: newPlayer };
    res.json(out);
  }

  static async byId(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    assert(id);

    const game = await DBService.getGame(id);

    const out: MessageGetGame = { game: GameService.stripGame(game.game) };
    res.json(out);
  }
}
