import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ToolError } from '../../../src/errors/index.js';
import { readFileTool } from '../../../src/tools/read-file.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ditto-rf-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('readFile tool', () => {
  it('reads file content and size', async () => {
    writeFileSync(join(dir, 'a.txt'), 'hello');
    const result = await readFileTool.execute('a.txt', { cwd: dir, traceId: 't' });
    expect(result.content).toBe('hello');
    expect(result.sizeBytes).toBe(5);
  });

  it('throws ToolError when file is missing', async () => {
    await expect(
      readFileTool.execute('does-not-exist.txt', { cwd: dir, traceId: 't' }),
    ).rejects.toBeInstanceOf(ToolError);
  });
});
