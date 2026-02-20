import { describe, it, expect } from 'vitest';
import { normalizeUrls, validateUrls } from '../../src/routes/jobs.js';

describe('normalizeUrls', () => {
  it('trims and removes empty lines', () => {
    const result = normalizeUrls(['  https://www.instagram.com/p/ABC123/ ', '', '   ']);
    expect(result).toEqual(['https://www.instagram.com/p/ABC123/']);
  });
});

describe('validateUrls', () => {
  it('rejects empty input', () => {
    const result = validateUrls([]);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  it('rejects oversized batch', () => {
    const urls = Array.from({ length: 201 }, (_, i) => `https://www.facebook.com/post/${i}`);
    const result = validateUrls(urls);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  it('rejects unsupported platforms', () => {
    const result = validateUrls(['https://example.com/post/1']);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('unsupported URLs found');
  });

  it('accepts supported urls', () => {
    const result = validateUrls([
      'https://www.instagram.com/p/ABC123/',
      'https://www.facebook.com/some-post',
      'https://www.threads.net/@user/post/abc'
    ]);

    expect(result.ok).toBe(true);
    expect(result.urls.length).toBe(3);
  });
});
