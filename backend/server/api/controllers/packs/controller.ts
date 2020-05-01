import GameService from '../../services/game.service';
import { Request, Response } from 'express';

export class Controller {
  indexPacks(req: Request, res: Response): void {
    res.json(GameService.getAvailablePacks());
  }
}
export default new Controller();
