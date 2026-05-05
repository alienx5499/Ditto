import { exec } from 'node:child_process';

import { ToolError } from '../errors/index.js';
import { executeCommandArgsSchema } from '../schemas/tool-args.js';
import type { ToolDescriptor } from '../types/index.js';

interface CommandResult {
  cmd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_BUFFER = 8 * 1024 * 1024;

export const executeCommandTool: ToolDescriptor<unknown, CommandResult> = {
  name: 'executeCommand',
  description:
    'Run a shell command. Use for installs, scaffolding, or git. ' +
    'Args: a string command, or { cmd: string, timeoutMs?: number }.',
  parametersJsonSchema: {
    oneOf: [
      { type: 'string' },
      {
        type: 'object',
        properties: {
          cmd: { type: 'string' },
          timeoutMs: { type: 'integer', minimum: 1, maximum: 120000 },
        },
        required: ['cmd'],
      },
    ],
  },
  async execute(rawArgs, ctx) {
    const parsed = executeCommandArgsSchema.safeParse(rawArgs);
    if (!parsed.success) {
      throw new ToolError(this.name, `Invalid args: ${parsed.error.message}`, {
        code: 'TOOL_BAD_ARGS',
      });
    }
    const { cmd, timeoutMs } =
      typeof parsed.data === 'string' ? { cmd: parsed.data, timeoutMs: undefined } : parsed.data;
    const effectiveTimeout = timeoutMs ?? DEFAULT_TIMEOUT_MS;

    return new Promise<CommandResult>((resolve, reject) => {
      const child = exec(
        cmd,
        { cwd: ctx.cwd, timeout: effectiveTimeout, maxBuffer: MAX_BUFFER },
        (error, stdout, stderr) => {
          if (error) {
            reject(
              new ToolError(
                'executeCommand',
                `Command failed (exit ${error.code ?? 1}): ${error.message.split('\n')[0]}`,
                { code: 'TOOL_CMD_FAILED', cause: { stdout, stderr, exitCode: error.code } },
              ),
            );
            return;
          }
          resolve({
            cmd,
            exitCode: 0,
            stdout: stdout.toString(),
            stderr: stderr.toString(),
          });
        },
      );
      ctx.signal?.addEventListener(
        'abort',
        () => {
          child.kill('SIGTERM');
        },
        { once: true },
      );
    });
  },
};
