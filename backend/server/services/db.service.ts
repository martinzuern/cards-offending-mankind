import Redis from 'ioredis';
import Redlock from 'redlock';
import assert from 'assert';
import { InternalGameState } from '../../root-types';

import L from '../common/logger';
import { HttpError } from '../api/middlewares/error.handler';

const LOCK_TIMEOUT = 3000;
const GAME_EXPIRATION = 60 * 60 * 24; // 24 hrs

export default class DBService {
  static client?: Redis.Redis;

  static redlock?: Redlock;

  static start(): Promise<void> {
    L.info('Starting DB Server');
    this.client = new Redis(process.env.REDIS_URL);
    this.redlock = new Redlock([this.client]);
    return new Promise((resolve) => this.client.on('ready', resolve));
  }

  static async shutdown(): Promise<void> {
    L.info('Shutting down connection');
    const { client, redlock } = this;
    this.client = undefined;
    this.redlock = undefined;
    await client?.quit();
    await redlock?.quit();
  }

  static async setUserLock(id: string, create = false): Promise<boolean> {
    L.info(`locking user with id ${id}`);
    assert(this.client !== undefined, 'DB Connection is not established.');
    const canConnect = await this.client.set(
      `user-active:${id}`,
      'locked',
      ['EX', 30],
      create ? 'NX' : 'XX'
    );
    return canConnect === 'OK';
  }

  static async deleteUserLock(id: string): Promise<boolean> {
    L.info(`unlocking user with id ${id}`);
    assert(this.client !== undefined, 'DB Connection is not established.');
    const delNo = await this.client.del(`user-active:${id}`);
    return delNo > 0;
  }

  static async isUserLocked(id: string): Promise<boolean> {
    assert(this.client !== undefined, 'DB Connection is not established.');
    const lock = await this.client.exists(`user-active:${id}`);
    return lock === 1;
  }

  static async getGame(id: string): Promise<InternalGameState> {
    L.info(`fetch game with id ${id}`);
    assert(this.client !== undefined, 'DB Connection is not established.');
    const data = await this.client.get(`game:${id}`);
    if (!data) throw new HttpError('Resource not found.', 404);
    return JSON.parse(data);
  }

  static async writeGame(data: InternalGameState, create = false): Promise<InternalGameState> {
    const { id } = data.game;
    L.info(`write game with id ${id}`);
    assert(this.client !== undefined, 'DB Connection is not established.');
    assert(id);
    const payload = JSON.stringify(data);
    const key = `game:${id}`;
    const resp = await this.client.set(key, payload, ['EX', GAME_EXPIRATION], create ? 'NX' : 'XX');
    assert(resp === 'OK', 'Could not write to database.');
    return data;
  }

  static async updateGame(
    id: string,
    updateFn: (data: InternalGameState) => Promise<InternalGameState | null>
  ): Promise<void> {
    L.info(`Requesting lock for game with id ${id}`);
    assert(this.client !== undefined, 'DB Connection is not established.');
    const lock = await this.redlock.acquire([`lock:game:${id}`], LOCK_TIMEOUT);
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
      await lock.release();
      L.info(`Released lock for game with id ${id}`);
    }
  }
}
