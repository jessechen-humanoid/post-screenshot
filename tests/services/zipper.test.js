import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { buildJobZip } from '../../src/services/zipper.js';
import { ensureJobDir, zipPath } from '../../src/storage.js';
import { execSync } from 'child_process';

describe('buildJobZip', () => {
  it('returns null when no successful images exist', async () => {
    const job = {
      id: `job-empty-${Date.now()}`,
      items: [{ status: 'failed', imagePath: null }]
    };

    const result = await buildJobZip(job);
    expect(result).toBeNull();
    expect(fs.existsSync(zipPath(job.id))).toBe(false);
  });

  it('creates zip when successful images exist', async () => {
    const job = {
      id: `job-success-${Date.now()}`,
      items: []
    };
    const imageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-'));
    const imagePath = path.join(imageDir, '001.png');
    fs.writeFileSync(imagePath, 'fake-image');
    job.items.push({ status: 'success', imagePath });

    await ensureJobDir(job.id);
    const result = await buildJobZip(job);

    expect(result).toBe(zipPath(job.id));
    expect(fs.existsSync(result)).toBe(true);

    fs.rmSync(imageDir, { recursive: true, force: true });
  });

  it('uses custom file names in zip', async () => {
    const job = {
      id: `job-named-${Date.now()}`,
      items: []
    };
    const imageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-'));
    const imagePath = path.join(imageDir, '001.png');
    fs.writeFileSync(imagePath, 'fake-image');
    job.items.push({ status: 'success', imagePath, fileName: 'firstline.png' });

    await ensureJobDir(job.id);
    const result = await buildJobZip(job);
    const listOutput = execSync(`unzip -l "${result}"`).toString();

    expect(listOutput).toContain('firstline.png');

    fs.rmSync(imageDir, { recursive: true, force: true });
  });
});
