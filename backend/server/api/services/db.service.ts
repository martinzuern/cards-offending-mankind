import { createHandyClient } from 'handy-redis';
import Redlock from 'redlock';
import assert from 'assert';
import { FullGameState } from '../../../root-types';

import L from '../../common/logger';

const LOCK_TIMEOUT = 3000;

const client = createHandyClient();
const redlock = new Redlock([client.redis]);

export class DBService {
  async getGame(id: string): Promise<FullGameState> {
    L.info(`fetch game with id ${id}`);
    const data = await client.get(`game:${id}`);
    return JSON.parse(data);
  }

  async writeGame(data: FullGameState): Promise<FullGameState> {
    const id = data.game.id;
    L.info(`write game with id ${id}`);
    assert(id);
    const payload = JSON.stringify(data);
    await client.set(`game:${id}`, payload);
    return data;
  }

  async updateGame(
    id: string,
    updateFn: (data: FullGameState) => Promise<FullGameState>
  ): Promise<void> {
    L.info(`update game with id ${id}`);
    const lock = await redlock.lock(`lock:game:${id}`, LOCK_TIMEOUT);
    const previousGame = await this.getGame(id);
    
    const newGame = await updateFn(previousGame);
    
    await this.writeGame(newGame);
    await lock.unlock();
    L.info(`update game with id ${id} completed`);
  }
}

export default new DBService();
