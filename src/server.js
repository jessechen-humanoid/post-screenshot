import { createApp } from './app.js';
import { config } from './config.js';
import { createRedisConnection, createScreenshotQueue } from './queue.js';
import { JobStore } from './services/jobStore.js';
import { JobService } from './services/jobService.js';
import { ensureDataDir } from './storage.js';
import { startWorker } from './worker/index.js';

async function bootstrap() {
  await ensureDataDir();

  const redis = createRedisConnection(config.redisUrl);
  const queue = createScreenshotQueue(redis);
  const jobStore = new JobStore(redis);
  const jobService = new JobService({ jobStore, queue });

  startWorker({
    redis,
    concurrency: config.workerConcurrency,
    jobStore,
    pageTimeoutMs: config.pageTimeoutMs
  });

  const app = createApp({ jobService });
  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
