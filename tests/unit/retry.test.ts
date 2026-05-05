import { describe, expect, it } from 'vitest';

import { retry } from '../../src/utils/retry.js';

describe('retry', () => {
  it('returns the value on first success', async () => {
    const result = await retry(async () => 42);
    expect(result).toBe(42);
  });

  it('retries until success', async () => {
    let calls = 0;
    const result = await retry(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error('boom');
        return 'ok';
      },
      { attempts: 5, baseDelayMs: 1 },
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('throws after exhausting attempts', async () => {
    await expect(
      retry(
        async () => {
          throw new Error('always');
        },
        { attempts: 2, baseDelayMs: 1 },
      ),
    ).rejects.toThrow('always');
  });

  it('respects shouldRetry returning false', async () => {
    let calls = 0;
    await expect(
      retry(
        async () => {
          calls += 1;
          throw new Error('fatal');
        },
        { attempts: 5, baseDelayMs: 1, shouldRetry: () => false },
      ),
    ).rejects.toThrow('fatal');
    expect(calls).toBe(1);
  });
});
