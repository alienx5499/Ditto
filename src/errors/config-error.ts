import { DittoError } from './ditto-error.js';

export class ConfigError extends DittoError {
  constructor(message: string, options: { code?: string; cause?: unknown } = {}) {
    super(message, { code: options.code ?? 'CONFIG_ERROR', cause: options.cause });
    this.name = 'ConfigError';
  }
}
