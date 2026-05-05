import { DittoError } from './ditto-error.js';

export class ToolError extends DittoError {
  public readonly toolName: string;

  constructor(toolName: string, message: string, options: { code?: string; cause?: unknown } = {}) {
    super(message, { code: options.code ?? 'TOOL_ERROR', cause: options.cause });
    this.name = 'ToolError';
    this.toolName = toolName;
  }
}
