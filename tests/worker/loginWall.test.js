import { describe, it, expect } from 'vitest';
import { isLikelyLoginWall } from '../../src/worker/loginWall.js';

describe('isLikelyLoginWall', () => {
  it('detects instagram login page by url', () => {
    const result = isLikelyLoginWall({
      url: 'https://www.instagram.com/accounts/login/',
      title: 'Login • Instagram',
      text: ''
    });

    expect(result).toBe(true);
  });

  it('detects facebook login prompt by text', () => {
    const result = isLikelyLoginWall({
      url: 'https://www.facebook.com/some-post',
      title: 'Facebook',
      text: 'Log in to continue'
    });

    expect(result).toBe(true);
  });

  it('returns false for normal post content', () => {
    const result = isLikelyLoginWall({
      url: 'https://www.threads.net/@user/post/abc',
      title: 'Thread by user',
      text: 'post content body'
    });

    expect(result).toBe(false);
  });
});
