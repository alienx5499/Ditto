import { mkdir } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

import { ToolError } from '../errors/index.js';
import { makeDirectoryArgsSchema } from '../schemas/tool-args.js';
import type { ToolDescriptor } from '../types/index.js';

interface MakeDirectoryResult {
  path: string;
  created: boolean;
}

export const makeDirectoryTool: ToolDescriptor<unknown, MakeDirectoryResult> = {
  name: 'makeDirectory',
  description: 'Create a directory recursively. Args: a path string or { path: string }.',
  parametersJsonSchema: {
    oneOf: [
      { type: 'string' },
      { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    ],
  },
  async execute(rawArgs, ctx) {
    const parsed = makeDirectoryArgsSchema.safeParse(rawArgs);
    if (!parsed.success) {
      throw new ToolError(this.name, `Invalid args: ${parsed.error.message}`, {
        code: 'TOOL_BAD_ARGS',
      });
    }
    const path = typeof parsed.data === 'string' ? parsed.data : parsed.data.path;
    const target = isAbsolute(path) ? path : resolve(ctx.cwd, path);
    const result = await mkdir(target, { recursive: true });
    return { path: target, created: result !== undefined };
  },
};
