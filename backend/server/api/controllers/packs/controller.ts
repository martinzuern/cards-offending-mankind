import { Request, Response } from 'express';
import GameService from '../../../services/game.service';

export default class Controller {
  static indexPacks(req: Request, res: Response): void {
    res.json(GameService.getAvailablePacks());
  }
}
