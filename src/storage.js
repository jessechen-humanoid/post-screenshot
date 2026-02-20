import fs from 'fs/promises';
import path from 'path';
import { config } from './config.js';

export async function ensureDataDir() {
  await fs.mkdir(config.dataDir, { recursive: true });
}

export function jobDir(jobId) {
  return path.join(config.dataDir, jobId);
}

export async function ensureJobDir(jobId) {
  const dir = jobDir(jobId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export function screenshotPath(jobId, index) {
  return path.join(jobDir(jobId), `${String(index).padStart(3, '0')}.png`);
}

export function debugScreenshotPath(jobId, index) {
  return path.join(jobDir(jobId), `${String(index).padStart(3, '0')}.debug.png`);
}

export function zipPath(jobId) {
  return path.join(jobDir(jobId), 'screenshots.zip');
}
