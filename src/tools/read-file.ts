import { readFile, stat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

import { ToolError } from '../errors/index.js';
import { readFileArgsSchema } from '../schemas/tool-args.js';
import type { ToolDescriptor } from '../types/index.js';

interface ReadFileResult {
  path: string;
  content: string;
  sizeBytes: number;
}

export const readFileTool: ToolDescriptor<unknown, ReadFileResult> = {
  name: 'readFile',
  description: 'Read a UTF-8 text file. Args: a path string or { path: string }.',
  parametersJsonSchema: {
    oneOf: [
      { type: 'string' },
      { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    ],
  },
  async execute(rawArgs, ctx) {
    const parsed = readFileArgsSchema.safeParse(rawArgs);
    if (!parsed.success) {
      throw new ToolError(this.name, `Invalid args: ${parsed.error.message}`, {
        code: 'TOOL_BAD_ARGS',
      });
    }
    const path = typeof parsed.data === 'string' ? parsed.data : parsed.data.path;
    const target = isAbsolute(path) ? path : resolve(ctx.cwd, path);
    try {
      const [content, info] = await Promise.all([readFile(target, 'utf8'), stat(target)]);
      return { path: target, content, sizeBytes: info.size };
    } catch (err) {
      throw new ToolError(this.name, `Could not read ${target}: ${(err as Error).message}`, {
        code: 'TOOL_READ_FAILED',
        cause: err,
      });
    }
  },
};
