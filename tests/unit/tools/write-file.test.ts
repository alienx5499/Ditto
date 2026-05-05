import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ToolError } from '../../../src/errors/index.js';
import { writeFileTool } from '../../../src/tools/write-file.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ditto-wf-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('writeFile tool', () => {
  it('writes a file and creates parent directories', async () => {
    const result = await writeFileTool.execute(
      { path: 'nested/sub/hello.txt', contents: 'hi' },
      { cwd: dir, traceId: 't' },
    );
    expect(result.bytesWritten).toBe(2);
    expect(readFileSync(join(dir, 'nested/sub/hello.txt'), 'utf8')).toBe('hi');
  });

  it('throws ToolError on invalid args', async () => {
    await expect(
      writeFileTool.execute({ path: '' } as unknown, { cwd: dir, traceId: 't' }),
    ).rejects.toBeInstanceOf(ToolError);
  });
});
