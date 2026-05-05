import { DittoError } from './ditto-error.js';

export class ProviderError extends DittoError {
  public readonly httpStatus?: number;

  constructor(
    message: string,
    options: { code?: string; httpStatus?: number; cause?: unknown } = {},
  ) {
    super(message, { code: options.code ?? 'PROVIDER_ERROR', cause: options.cause });
    this.name = 'ProviderError';
    if (options.httpStatus !== undefined) {
      this.httpStatus = options.httpStatus;
    }
  }
}
