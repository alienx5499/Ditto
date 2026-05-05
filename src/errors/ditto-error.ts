/**
 * Base error type for all Ditto-thrown errors.
 *
 * Carries a stable `code` for log filtering and an optional `cause` for chained debugging.
 */
export class DittoError extends Error {
  public readonly code: string;

  constructor(
    message: string,
    options: { code: string; cause?: unknown } = { code: 'DITTO_ERROR' },
  ) {
    super(message);
    this.name = 'DittoError';
    this.code = options.code;
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
