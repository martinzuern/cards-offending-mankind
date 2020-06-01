import assert from 'assert';
import socketIo from 'socket.io';
import Queue from 'bull';

import L from '../../../common/logger';
import { UUID, RoundTimeoutKeys } from '../../../../../types';
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
    this.timeoutQueue = new Queue('game timeouts', process.env.REDIS_URL);
    this.timeoutQueue.process(this.processJob);
  }

  static jobId(data: GameTimeoutJob): string {
    const { gameId, roundIdx, eventName } = data;
    return `${gameId}-${roundIdx}-${eventName}`;
  }

  setSocketServer(io: socketIo.Server): void {
    this.io = io;
  }

  async processJob(job: Queue.Job<GameTimeoutJob>): Promise<void> {
    assert(this.io, 'SocketServer is not set, cannot process job');
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
      L.info('%s - Fired!', logPrefix);
      await handlerFn(roundIdx);
    } catch (error) {
      // We expect errors here, as the timeouts might be set from different players.
      L.warn('%s - ERROR: %o', logPrefix, error);
    }
  }

  addJob(data: GameTimeoutJob, delay: number): Promise<Queue.Job<GameTimeoutJob>> {
    const jobId = TimeoutQueue.jobId(data);
    return this.timeoutQueue.add(data, { delay, jobId });
  }

  async clearJob(data: GameTimeoutJob): Promise<void> {
    const jobId = TimeoutQueue.jobId(data);
    const job = await this.timeoutQueue.getJob(jobId);
    if (job) await job.remove();
  }
}

export default new TimeoutQueue();
