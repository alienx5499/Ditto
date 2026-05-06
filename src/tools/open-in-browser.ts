import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

import { ToolError } from '../errors/index.js';
import { openInBrowserArgsSchema } from '../schemas/tool-args.js';
import type { ToolDescriptor } from '../types/index.js';

interface OpenInBrowserResult {
  path: string;
  opened: true;
}

export const openInBrowserTool: ToolDescriptor<unknown, OpenInBrowserResult> = {
  name: 'openInBrowser',
  description:
    'Open a local file or URL in the default browser (cross-platform). ' +
    'Args: a path/URL string or { path: string }.',
  parametersJsonSchema: {
    oneOf: [
      { type: 'string' },
      { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    ],
  },
  async execute(rawArgs, ctx) {
    const parsed = openInBrowserArgsSchema.safeParse(rawArgs);
    if (!parsed.success) {
      throw new ToolError(this.name, `Invalid args: ${parsed.error.message}`, {
        code: 'TOOL_BAD_ARGS',
      });
    }
    const raw = typeof parsed.data === 'string' ? parsed.data : parsed.data.path;
    const isUrl = /^https?:\/\//i.test(raw);
    const target = isUrl ? raw : isAbsolute(raw) ? raw : resolve(ctx.cwd, raw);
    if (!isUrl && !existsSync(target)) {
      throw new ToolError(this.name, `Path does not exist: ${target}`, {
        code: 'TOOL_OPEN_NOT_FOUND',
      });
    }
    const platform = process.platform;
    let cmd: string;
    let args: string[];
    if (platform === 'darwin') {
      cmd = 'open';
      args = [target];
    } else if (platform === 'win32') {
      cmd = 'cmd';
      args = ['/c', 'start', '""', target];
    } else {
      cmd = 'xdg-open';
      args = [target];
    }
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
    // In headless CI containers (e.g. act), opener binaries may not exist.
    // Swallow async spawn errors to avoid unhandled exceptions.
    child.on('error', () => undefined);
    child.unref();
    return { path: target, opened: true };
  },
};
