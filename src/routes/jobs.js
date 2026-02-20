import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { detectPlatform } from '../shared/platform.js';

const MAX_BATCH = 200;

export function normalizeUrls(urls) {
  return urls
    .map((url) => String(url || '').trim())
    .filter(Boolean);
}

export function validateUrls(inputUrls) {
  if (!Array.isArray(inputUrls)) {
    return { ok: false, status: 400, error: 'urls must be a non-empty array' };
  }

  const urls = normalizeUrls(inputUrls);
  if (urls.length === 0) {
    return { ok: false, status: 400, error: 'urls must be a non-empty array' };
  }

  if (urls.length > MAX_BATCH) {
    return { ok: false, status: 400, error: `urls length must be <= ${MAX_BATCH}` };
  }

  const unsupported = urls.filter((url) => !detectPlatform(url));
  if (unsupported.length > 0) {
    return {
      ok: false,
      status: 400,
      error: 'unsupported URLs found',
      unsupported
    };
  }

  return { ok: true, urls };
}

export function resolveDownloadState(zip) {
  if (!zip) {
    return { ok: false, status: 409, error: 'zip not ready' };
  }

  if (!fs.existsSync(zip)) {
    return { ok: false, status: 404, error: 'zip not found on disk' };
  }

  return { ok: true, zip };
}

export function createJobsRouter({ jobService }) {
  const router = Router();

  router.post('/', async (req, res) => {
    const validation = validateUrls(req.body?.urls);
    if (!validation.ok) {
      return res.status(validation.status).json({
        error: validation.error,
        unsupported: validation.unsupported
      });
    }

    const { id } = await jobService.createJob(validation.urls);
    return res.status(202).json({ jobId: id });
  });

  router.get('/:id', async (req, res) => {
    const job = await jobService.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'job not found' });
    }

    return res.json({ job });
  });

  router.get('/:id/download', async (req, res) => {
    const zip = await jobService.getZipPath(req.params.id);
    const result = resolveDownloadState(zip);
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.download(path.resolve(result.zip), `${req.params.id}.zip`);
  });

  return router;
}
