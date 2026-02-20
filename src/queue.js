import IORedis from 'ioredis';
import { Queue, Worker } from 'bullmq';

export const SCREENSHOT_QUEUE = 'screenshot-items';

export function createRedisConnection(redisUrl) {
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true
  });
}

export function createScreenshotQueue(connection) {
  return new Queue(SCREENSHOT_QUEUE, { connection });
}

export async function enqueueScreenshots(queue, jobId, items) {
  const jobs = items.map((item) => ({
    name: 'capture',
    data: {
      jobId,
      index: item.index,
      url: item.url,
      platform: item.platform
    },
    opts: {
      attempts: 2,
      removeOnComplete: true,
      removeOnFail: true
    }
  }));

  await queue.addBulk(jobs);
}

export function createScreenshotWorker(connection, concurrency, processor) {
  return new Worker(SCREENSHOT_QUEUE, processor, {
    connection,
    concurrency
  });
}
