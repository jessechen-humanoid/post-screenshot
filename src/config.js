import path from 'path';

const rootDir = process.cwd();

export const config = {
  port: Number(process.env.PORT || 3000),
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  workerConcurrency: Number(process.env.WORKER_CONCURRENCY || 4),
  dataDir: process.env.DATA_DIR || path.join(rootDir, 'data', 'jobs'),
  pageTimeoutMs: Number(process.env.PAGE_TIMEOUT_MS || 45000)
};
