import { createHandyClient } from 'handy-redis';
import Redlock from 'redlock';
import assert from 'assert';
import { FullGameState } from '../../../root-types';

import L from '../../common/logger';
import { HttpError } from '../middlewares/error.handler';

const LOCK_TIMEOUT = 3000;
const GAME_EXPIRATION = 60 * 60 * 24; // 24 hrs

const client = createHandyClient({ url: process.env.REDIS_URL });
const redlock = new Redlock([client.redis]);

export class DBService {
  async setUserLock(id: string, create = false): Promise<boolean> {
    L.info(`locking user with id ${id}`);
    const canConnect = await client.set(
      `user-active:${id}`,
      'locked',
      ['EX', 30],
      create ? 'NX' : 'XX'
    );
    return !!canConnect;
  }

  async deleteUserLock(id: string): Promise<boolean> {
    L.info(`unlocking user with id ${id}`);
    const delNo = await client.del(`user-active:${id}`);
    return delNo > 0;
  }

  async getGame(id: string): Promise<FullGameState> {
    L.info(`fetch game with id ${id}`);
    const data = await client.get(`game:${id}`);
    if (data) {
      return JSON.parse(data);
    } else {
      throw new HttpError('Resource not found.', 404);
    }
  }

  async writeGame(data: FullGameState, create = false): Promise<FullGameState> {
    const id = data.game.id;
    L.info(`write game with id ${id}`);
    assert(id);
    const payload = JSON.stringify(data);
    const key = `game:${id}`;
    await client.set(key, payload, ['EX', GAME_EXPIRATION], create ? 'NX' : 'XX');
    return data;
  }

  async updateGame(
    id: string,
    updateFn: (data: FullGameState) => Promise<FullGameState | null>
  ): Promise<void> {
    L.info(`Requesting lock for game with id ${id}`);
    const lock = await redlock.lock(`lock:game:${id}`, LOCK_TIMEOUT);
    L.info(`Holding lock for game with id ${id}`);

    try {
      const previousGame = await this.getGame(id);
      assert(previousGame);
      const newGame = await updateFn(previousGame);
      assert(newGame);
      await this.writeGame(newGame);
    } catch (error) {
      L.error(`while update game with id ${id} "${error.message}"`);
      throw error;
    } finally {
      await lock.unlock();
      L.info(`Released lock for game with id ${id}`);
    }
  }
}

export default new DBService();
