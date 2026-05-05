/**
 * Simple exponential-backoff retry with optional abort support.
 */
export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

const DEFAULT_OPTIONS = {
  attempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 5_000,
};

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? DEFAULT_OPTIONS.attempts;
  const base = options.baseDelayMs ?? DEFAULT_OPTIONS.baseDelayMs;
  const max = options.maxDelayMs ?? DEFAULT_OPTIONS.maxDelayMs;
  const should = options.shouldRetry ?? (() => true);

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (options.signal?.aborted) {
      throw new Error('Operation aborted');
    }
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !should(error, attempt)) break;
      const delayMs = Math.min(max, base * 2 ** (attempt - 1));
      options.onRetry?.(error, attempt, delayMs);
      await sleep(delayMs, options.signal);
    }
  }
  throw lastError;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Operation aborted'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new Error('Operation aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
