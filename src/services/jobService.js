import { randomUUID } from 'crypto';
import { detectPlatform } from '../shared/platform.js';
import { enqueueScreenshots } from '../queue.js';

export class JobService {
  constructor({ jobStore, queue }) {
    this.jobStore = jobStore;
    this.queue = queue;
  }

  async createJob(urls) {
    const id = randomUUID();
    const items = urls.map((url, index) => ({
      index,
      url,
      platform: detectPlatform(url),
      status: 'queued'
    }));

    const job = { id, items };

    await this.jobStore.initJob(job);
    await enqueueScreenshots(this.queue, id, items);

    return { id };
  }

  async getJob(jobId) {
    return this.jobStore.getJob(jobId);
  }

  async getZipPath(jobId) {
    const job = await this.jobStore.getJob(jobId);
    return job?.zipPath || null;
  }
}
