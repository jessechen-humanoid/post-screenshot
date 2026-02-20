import { describe, it, expect } from 'vitest';
import { buildFailureResult, buildImageFilename } from '../../src/worker/index.js';

describe('buildFailureResult', () => {
  it('includes debug screenshot path in result and message', () => {
    const error = {
      code: 'LOGIN_WALL',
      message: 'Detected login wall',
      debugPath: '/tmp/job/001.debug.png'
    };

    const result = buildFailureResult(error);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('LOGIN_WALL');
    expect(result.debugImagePath).toBe('/tmp/job/001.debug.png');
    expect(result.errorMessage).toContain('/tmp/job/001.debug.png');
  });
});

describe('buildImageFilename', () => {
  it('uses post content first 8 chars', () => {
    const name = buildImageFilename('昨晚超快速！凌晨再用小雞上工，然後問了好幾間！', 0);
    expect(name).toBe('昨晚超快速凌晨再.png');
  });

  it('skips likely author lines', () => {
    const input = 'jokesonme.studio and 4 others\n台北不是我的家 會員限定內容 2.5 月號\n128 likes';
    const name = buildImageFilename(input, 0);
    expect(name).toBe('台北不是我的家會.png');
  });

  it('skips date-like first line and picks content line', () => {
    const input = '04/16/25\n畢業啦！2 年 4 個月的時間';
    const name = buildImageFilename(input, 0);
    expect(name).toBe('畢業啦2年4個月.png');
  });

  it('skips instagram account line and uses caption line', () => {
    const input = 'jokesonme.studio\n23 hours ago\n一起成為看我笑話付費會員吧！';
    const name = buildImageFilename(input, 0);
    expect(name).toBe('一起成為看我笑話.png');
  });

  it('falls back when content is empty', () => {
    const name = buildImageFilename('', 1);
    expect(name).toBe('post-2.png');
  });
});
