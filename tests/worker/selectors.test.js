import { describe, it, expect } from 'vitest';
import { selectorsForPlatform } from '../../src/worker/selectors.js';

describe('selectorsForPlatform', () => {
  it('returns selector list for facebook', () => {
    const selectors = selectorsForPlatform('facebook');
    expect(selectors.length).toBeGreaterThan(0);
  });

  it('returns selector list for instagram', () => {
    const selectors = selectorsForPlatform('instagram');
    expect(selectors).toContain('article');
  });

  it('returns selector list for threads', () => {
    const selectors = selectorsForPlatform('threads');
    expect(selectors.length).toBeGreaterThan(0);
    expect(selectors).toContain("div[data-pressable-container='true']");
  });

  it('throws for unsupported platform', () => {
    expect(() => selectorsForPlatform('x')).toThrowError();
  });
});
