import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ToolError } from '../../../src/errors/index.js';
import { executeCommandTool } from '../../../src/tools/execute-command.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ditto-cmd-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('executeCommand tool', () => {
  it('runs a successful shell command', async () => {
    const result = await executeCommandTool.execute('echo hello-ditto', {
      cwd: dir,
      traceId: 't',
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('hello-ditto');
  });

  it('rejects with ToolError on a failing command', async () => {
    await expect(
      executeCommandTool.execute('node -e "process.exit(2)"', { cwd: dir, traceId: 't' }),
    ).rejects.toBeInstanceOf(ToolError);
  });
});
