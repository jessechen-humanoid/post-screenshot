import { describe, it, expect } from 'vitest';
import { detectPlatform } from '../../src/shared/platform.js';

describe('detectPlatform', () => {
  it('detects facebook urls', () => {
    expect(detectPlatform('https://www.facebook.com/some-post')).toBe('facebook');
  });

  it('detects instagram urls', () => {
    expect(detectPlatform('https://www.instagram.com/p/ABC123/')).toBe('instagram');
  });

  it('detects threads urls', () => {
    expect(detectPlatform('https://www.threads.net/@user/post/abc')).toBe('threads');
  });

  it('detects threads.com urls', () => {
    expect(detectPlatform('https://www.threads.com/@user/post/abc')).toBe('threads');
  });

  it('returns null for unsupported urls', () => {
    expect(detectPlatform('https://example.com/post/1')).toBeNull();
  });
});
