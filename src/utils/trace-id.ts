import { randomBytes } from 'node:crypto';

/**
 * Short, log-friendly trace id used to correlate one agent turn across logs.
 */
export function newTraceId(): string {
  return randomBytes(4).toString('hex');
}
