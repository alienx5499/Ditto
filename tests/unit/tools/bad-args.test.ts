import { describe, expect, it } from 'vitest';

import { ToolError } from '../../../src/errors/index.js';
import { executeCommandTool } from '../../../src/tools/execute-command.js';
import { fetchUrlTool } from '../../../src/tools/fetch-url.js';
import { openInBrowserTool } from '../../../src/tools/open-in-browser.js';

const ctx = { cwd: process.cwd(), traceId: 't' };

describe('I/O tools - argument validation branches', () => {
  it('executeCommand rejects empty string', async () => {
    await expect(executeCommandTool.execute('', ctx)).rejects.toBeInstanceOf(ToolError);
  });

  it('executeCommand rejects malformed object', async () => {
    await expect(executeCommandTool.execute({ cmd: '' } as unknown, ctx)).rejects.toBeInstanceOf(
      ToolError,
    );
  });

  it('fetchUrl rejects non-URL strings', async () => {
    await expect(fetchUrlTool.execute('not a url', ctx)).rejects.toBeInstanceOf(ToolError);
  });

  it('openInBrowser rejects non-existent local path', async () => {
    await expect(
      openInBrowserTool.execute('/this/path/does/not/exist/here.html', ctx),
    ).rejects.toBeInstanceOf(ToolError);
  });
});
