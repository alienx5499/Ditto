import { readdir } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

import { ToolError } from '../errors/index.js';
import { listDirectoryArgsSchema } from '../schemas/tool-args.js';
import type { ToolDescriptor } from '../types/index.js';

interface DirEntry {
  name: string;
  type: 'file' | 'directory' | 'symlink' | 'other';
}

interface ListDirectoryResult {
  path: string;
  entries: DirEntry[];
}

export const listDirectoryTool: ToolDescriptor<unknown, ListDirectoryResult> = {
  name: 'listDirectory',
  description: 'List entries in a directory. Args: a path string or { path: string }.',
  parametersJsonSchema: {
    oneOf: [
      { type: 'string' },
      { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    ],
  },
  async execute(rawArgs, ctx) {
    const parsed = listDirectoryArgsSchema.safeParse(rawArgs);
    if (!parsed.success) {
      throw new ToolError(this.name, `Invalid args: ${parsed.error.message}`, {
        code: 'TOOL_BAD_ARGS',
      });
    }
    const path = typeof parsed.data === 'string' ? parsed.data : parsed.data.path;
    const target = isAbsolute(path) ? path : resolve(ctx.cwd, path);
    const dirents = await readdir(target, { withFileTypes: true });
    const entries: DirEntry[] = dirents.map((d) => ({
      name: d.name,
      type: d.isFile()
        ? 'file'
        : d.isDirectory()
          ? 'directory'
          : d.isSymbolicLink()
            ? 'symlink'
            : 'other',
    }));
    return { path: target, entries };
  },
};
