import { describe, expect, it } from 'vitest';
import { browserLaunchOptions, mapCaptureError } from '../../src/worker/screenshot.js';

describe('browserLaunchOptions', () => {
  it('includes container-safe chromium args', () => {
    const options = browserLaunchOptions();
    expect(options.headless).toBe(true);
    expect(options.args).toContain('--no-sandbox');
    expect(options.args).toContain('--disable-setuid-sandbox');
    expect(options.args).toContain('--disable-dev-shm-usage');
  });
});

describe('mapCaptureError', () => {
  it('maps timeout errors', () => {
    const err = new Error('timed out');
    err.name = 'TimeoutError';

    const mapped = mapCaptureError(err);
    expect(mapped.code).toBe('TIMEOUT');
  });

  it('maps browser startup errors', () => {
    const err = new Error('Executable does not exist at /ms-playwright/chromium');
    const mapped = mapCaptureError(err);
    expect(mapped.code).toBe('BROWSER_LAUNCH_FAILED');
  });
});
