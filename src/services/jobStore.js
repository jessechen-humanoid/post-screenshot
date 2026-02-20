function jobKey(jobId) {
  return `job:${jobId}`;
}

function itemKey(jobId) {
  return `job:${jobId}:items`;
}

function zipLockKey(jobId) {
  return `job:${jobId}:zip-lock`;
}

function serialize(item) {
  return JSON.stringify(item);
}

function deserialize(value) {
  return JSON.parse(value);
}

export class JobStore {
  constructor(redis) {
    this.redis = redis;
  }

  async initJob(job) {
    const jobHash = jobKey(job.id);
    const itemsHash = itemKey(job.id);

    const pipeline = this.redis.pipeline();
    pipeline.hset(jobHash, {
      id: job.id,
      status: 'queued',
      createdAt: String(Date.now()),
      total: String(job.items.length),
      completed: '0',
      success: '0',
      failed: '0'
    });

    for (const item of job.items) {
      pipeline.hset(itemsHash, String(item.index), serialize(item));
    }

    await pipeline.exec();
  }

  async getJob(jobId) {
    const [jobHash, rawItems] = await Promise.all([
      this.redis.hgetall(jobKey(jobId)),
      this.redis.hgetall(itemKey(jobId))
    ]);

    if (!jobHash.id) {
      return null;
    }

    const items = Object.entries(rawItems)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([, value]) => deserialize(value));

    return {
      id: jobHash.id,
      status: jobHash.status,
      createdAt: Number(jobHash.createdAt),
      total: Number(jobHash.total),
      completed: Number(jobHash.completed),
      success: Number(jobHash.success),
      failed: Number(jobHash.failed),
      zipPath: jobHash.zipPath || null,
      items
    };
  }

  async markItemStarted(jobId, index) {
    await this.#updateItem(jobId, index, (item) => ({ ...item, status: 'processing' }));
  }

  async markItemFinished(jobId, index, result) {
    const status = result.ok ? 'success' : 'failed';

    await this.#updateItem(jobId, index, (item) => ({
      ...item,
      status,
      errorCode: result.ok ? null : result.errorCode,
      errorMessage: result.ok ? null : result.errorMessage,
      debugImagePath: result.ok ? null : (result.debugImagePath || null),
      fileName: result.ok ? (result.fileName || null) : null,
      imagePath: result.ok ? result.imagePath : null
    }));

    const pipeline = this.redis.pipeline();
    pipeline.hincrby(jobKey(jobId), 'completed', 1);
    pipeline.hincrby(jobKey(jobId), result.ok ? 'success' : 'failed', 1);
    await pipeline.exec();

    const meta = await this.redis.hgetall(jobKey(jobId));
    const completed = Number(meta.completed || 0);
    const total = Number(meta.total || 0);

    if (completed >= total) {
      await this.redis.hset(jobKey(jobId), { status: 'completed' });
      return true;
    }

    return false;
  }

  async setJobStatus(jobId, status) {
    await this.redis.hset(jobKey(jobId), { status });
  }

  async setZipPath(jobId, path) {
    await this.redis.hset(jobKey(jobId), { zipPath: path });
  }

  async acquireZipLock(jobId) {
    const result = await this.redis.set(zipLockKey(jobId), '1', 'NX', 'EX', 120);
    return result === 'OK';
  }

  async #updateItem(jobId, index, updater) {
    const key = itemKey(jobId);
    const raw = await this.redis.hget(key, String(index));

    if (!raw) {
      return;
    }

    const next = updater(deserialize(raw));
    await this.redis.hset(key, String(index), serialize(next));
  }
}
