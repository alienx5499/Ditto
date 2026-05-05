import { DittoError } from './ditto-error.js';

export class ParseError extends DittoError {
  public readonly raw: string;

  constructor(message: string, raw: string, options: { code?: string; cause?: unknown } = {}) {
    super(message, { code: options.code ?? 'PARSE_ERROR', cause: options.cause });
    this.name = 'ParseError';
    this.raw = raw;
  }
}
