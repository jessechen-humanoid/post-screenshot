import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app.js';

describe('createApp', () => {
  it('returns an express app instance', () => {
    const app = createApp({
      jobService: {
        async createJob() {
          return { id: '1' };
        },
        async getJob() {
          return null;
        },
        async getZipPath() {
          return null;
        }
      }
    });

    expect(typeof app).toBe('function');
    expect(typeof app.use).toBe('function');
  });
});
