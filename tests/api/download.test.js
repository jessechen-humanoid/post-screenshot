import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { resolveDownloadState } from '../../src/routes/jobs.js';

describe('resolveDownloadState', () => {
  it('returns 409 when zip is not ready', () => {
    const result = resolveDownloadState(null);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(409);
  });

  it('returns 404 when zip path missing on disk', () => {
    const result = resolveDownloadState('/tmp/not-found.zip');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
  });

  it('returns ok when zip exists', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-test-'));
    const zip = path.join(tempDir, 'screenshots.zip');
    fs.writeFileSync(zip, 'dummy');

    const result = resolveDownloadState(zip);
    expect(result.ok).toBe(true);
    expect(result.zip).toBe(zip);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
