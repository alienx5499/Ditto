import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';

import { ToolError } from '../errors/index.js';
import { writeFileArgsSchema } from '../schemas/tool-args.js';
import type { ToolDescriptor } from '../types/index.js';

interface WriteFileResult {
  path: string;
  bytesWritten: number;
}

export const writeFileTool: ToolDescriptor<unknown, WriteFileResult> = {
  name: 'writeFile',
  description:
    'Create or overwrite a UTF-8 text file. Auto-creates parent directories. ' +
    'Args: { path: string, contents: string }.',
  parametersJsonSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', minLength: 1 },
      contents: { type: 'string' },
    },
    required: ['path', 'contents'],
  },
  async execute(rawArgs, ctx) {
    const parsed = writeFileArgsSchema.safeParse(rawArgs);
    if (!parsed.success) {
      throw new ToolError(this.name, `Invalid args: ${parsed.error.message}`, {
        code: 'TOOL_BAD_ARGS',
      });
    }
    const target = isAbsolute(parsed.data.path)
      ? parsed.data.path
      : resolve(ctx.cwd, parsed.data.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, parsed.data.contents, 'utf8');
    return { path: target, bytesWritten: Buffer.byteLength(parsed.data.contents, 'utf8') };
  },
};
