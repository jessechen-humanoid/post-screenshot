import { createScreenshotWorker } from '../queue.js';
import { capturePostScreenshot } from './screenshot.js';
import { buildJobZip } from '../services/zipper.js';
import { debugScreenshotPath, ensureJobDir, screenshotPath } from '../storage.js';

export function startWorker({ redis, concurrency, jobStore, pageTimeoutMs }) {
  return createScreenshotWorker(redis, concurrency, async (job) => {
    const { jobId, index, url, platform } = job.data;

    await ensureJobDir(jobId);
    await jobStore.markItemStarted(jobId, index);

    const outputPath = screenshotPath(jobId, index);
    const debugPath = debugScreenshotPath(jobId, index);

    try {
      const capture = await capturePostScreenshot({
        url,
        platform,
        outputPath,
        debugPath,
        timeoutMs: pageTimeoutMs
      });

      const isFinal = await jobStore.markItemFinished(jobId, index, {
        ok: true,
        imagePath: outputPath,
        fileName: buildImageFilename(capture?.contentText || '', index)
      });

      if (isFinal) {
        await maybeBuildZip(jobStore, jobId);
      }
    } catch (error) {
      const isFinal = await jobStore.markItemFinished(jobId, index, buildFailureResult(error));

      if (isFinal) {
        await maybeBuildZip(jobStore, jobId);
      }
    }
  });
}

export function buildFailureResult(error) {
  const baseMessage = error.message || 'Unknown error';
  const debugImagePath = error.debugPath || null;
  const errorMessage = debugImagePath
    ? `${baseMessage} | Debug screenshot: ${debugImagePath}`
    : baseMessage;

  return {
    ok: false,
    errorCode: error.code || 'UNKNOWN',
    errorMessage,
    debugImagePath
  };
}

export function buildImageFilename(contentText, index) {
  const cleaned = pickPostContentLine(contentText);
  const normalized = cleaned
    .replace(/\s+/g, '')
    .replace(/[。！？!?]/g, '');
  const firstEight = Array.from(normalized).slice(0, 8).join('');
  const base = sanitizeFileName(firstEight || `post-${index + 1}`);
  return `${base}.png`;
}

function sanitizeFileName(value) {
  return value.replace(/[\\/:*?"<>|]/g, '').trim() || 'post';
}

function pickPostContentLine(contentText) {
  const lines = String(contentText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const ignored = [
    /and \d+ others/i,
    /^@[a-z0-9._]+$/i,
    /^[a-z0-9._]{2,30}$/i,
    /^(jokesonme\.studio|facebook|instagram|threads)$/i,
    /hours? ago|days? ago|minutes? ago/i,
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/,
    /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/,
    /\b\d{1,2}:\d{2}\b/,
    /(今天|昨天|小時前|天前|分鐘前|剛剛)/,
    /讚|留言|likes?|comments?|views?/i,
    /author|translate/i,
    /(回覆|replies|最相關|most relevant)/i
  ];

  const candidate = lines.find((line) => {
    if (ignored.some((rule) => rule.test(line))) {
      return false;
    }

    const plain = line.replace(/[@#]/g, '').trim();
    if (plain.length < 4) {
      return false;
    }

    const letters = plain.match(/[A-Za-z0-9._]/g) || [];
    if (letters.length / plain.length > 0.65) {
      return false;
    }

    return true;
  });
  return candidate || lines[0] || '';
}

async function maybeBuildZip(jobStore, jobId) {
  const lock = await jobStore.acquireZipLock(jobId);
  if (!lock) {
    return;
  }

  const job = await jobStore.getJob(jobId);
  const zipFile = await buildJobZip(job);
  if (zipFile) {
    await jobStore.setZipPath(jobId, zipFile);
  }
}
