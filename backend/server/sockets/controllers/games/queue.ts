import assert from 'assert';
import socketIo from 'socket.io';
import Queue from 'bull';

import L from '../../../common/logger';
import { UUID, RoundTimeoutKeys } from '../../../../../types';
// eslint-disable-next-line import/no-cycle
import Controller from './controller';

export type GameTimeoutJob = {
  gameId: UUID;
  roundIdx: number;
  eventName: RoundTimeoutKeys;
};

class TimeoutQueue {
  io?: socketIo.Server;
  timeoutQueue: Queue.Queue<GameTimeoutJob>;

  constructor() {
    this.timeoutQueue = new Queue('games-to', process.env.REDIS_URL);
    this.timeoutQueue.process(this.processJob);
  }

  static jobId(data: GameTimeoutJob): string {
    const { gameId, roundIdx, eventName } = data;
    return `${gameId}-${roundIdx}-${eventName}`;
  }

  setSocketServer(io: socketIo.Server): void {
    this.io = io;
  }

  addJob(data: GameTimeoutJob, delay: number): Promise<Queue.Job<GameTimeoutJob>> {
    L.debug('Add job: %o', data);
    assert(this.io !== undefined, 'SocketServer is not set, cannot add job');
    const jobId = TimeoutQueue.jobId(data);
    return this.timeoutQueue.add(data, { delay, jobId });
  }

  async clearJob(data: GameTimeoutJob): Promise<void> {
    L.debug('Clear job: %o', data);
    const jobId = TimeoutQueue.jobId(data);
    const job = await this.timeoutQueue.getJob(jobId);
    if (job) await job.remove();
  }

  processJob = async (job: Queue.Job<GameTimeoutJob>): Promise<void> => {
    L.debug('Process job: %o', job.data);
    assert(this.io !== undefined, 'SocketServer is not set, cannot process job');
    const { gameId, roundIdx, eventName } = job.data;
    const logPrefix = `Game ${gameId} - Timeout ${eventName} at round ${roundIdx}`;

    const c = new Controller(this.io, gameId, 'TIMEOUT_JOB' as UUID);
    const handlerFns: Record<RoundTimeoutKeys, Function> = {
      playing: c.setRoundPlayed,
      revealing: c.setRoundRevealed,
      judging: c.setRoundEnded,
      betweenRounds: c.onStartNextRound,
    };
    const handlerFn = handlerFns[eventName];
    assert(handlerFn, 'No valid event submitted.');

    try {
      L.info('%s - Started processing!', logPrefix);
      await handlerFn(roundIdx);
      L.info('%s - Finished processing!', logPrefix);
    } catch (error) {
      // We expect errors here, as the timeouts might be set from different players.
      L.warn('%s - ERROR: %o', logPrefix, error);
    }
  };
}

export default new TimeoutQueue();
