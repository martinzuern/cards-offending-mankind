import { createHandyClient } from 'handy-redis';
import Redlock from 'redlock';
import assert from 'assert';
import { InternalGameState } from '../../root-types';

import L from '../common/logger';
import { HttpError } from '../api/middlewares/error.handler';

const LOCK_TIMEOUT = 3000;
const GAME_EXPIRATION = 60 * 60 * 24; // 24 hrs

const client = createHandyClient({ url: process.env.REDIS_URL });
const redlock = new Redlock([client.redis]);

export default class DBService {
  static async setUserLock(id: string, create = false): Promise<boolean> {
    L.info(`locking user with id ${id}`);
    const canConnect = await client.set(
      `user-active:${id}`,
      'locked',
      ['EX', 30],
      create ? 'NX' : 'XX'
    );
    return canConnect === 'OK';
  }

  static async deleteUserLock(id: string): Promise<boolean> {
    L.info(`unlocking user with id ${id}`);
    const delNo = await client.del(`user-active:${id}`);
    return delNo > 0;
  }

  static async isUserLocked(id: string): Promise<boolean> {
    const lock = await client.get(`user-active:${id}`);
    return !!lock;
  }

  static async getGame(id: string): Promise<InternalGameState> {
    L.info(`fetch game with id ${id}`);
    const data = await client.get(`game:${id}`);
    if (!data) throw new HttpError('Resource not found.', 404);
    return JSON.parse(data);
  }

  static async writeGame(data: InternalGameState, create = false): Promise<InternalGameState> {
    const { id } = data.game;
    L.info(`write game with id ${id}`);
    assert(id);
    const payload = JSON.stringify(data);
    const key = `game:${id}`;
    const resp = await client.set(key, payload, ['EX', GAME_EXPIRATION], create ? 'NX' : 'XX');
    assert(resp === 'OK', 'Could not write to database.');
    return data;
  }

  static async updateGame(
    id: string,
    updateFn: (data: InternalGameState) => Promise<InternalGameState | null>
  ): Promise<void> {
    L.info(`Requesting lock for game with id ${id}`);
    const lock = await redlock.lock(`lock:game:${id}`, LOCK_TIMEOUT);
    L.info(`Holding lock for game with id ${id}`);

    try {
      const previousGame = await this.getGame(id);
      assert(previousGame, 'Could not find requested game.');
      const newGame = await updateFn(previousGame);
      assert(newGame, 'Updated game is invalid.');
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
