import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { listDirectoryTool } from '../../../src/tools/list-directory.js';
import { makeDirectoryTool } from '../../../src/tools/make-directory.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ditto-md-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('makeDirectory + listDirectory', () => {
  it('creates a nested directory recursively', async () => {
    const result = await makeDirectoryTool.execute('a/b/c', { cwd: dir, traceId: 't' });
    expect(existsSync(result.path)).toBe(true);
  });

  it('lists files and directories with types', async () => {
    writeFileSync(join(dir, 'file.txt'), 'x');
    await makeDirectoryTool.execute('subdir', { cwd: dir, traceId: 't' });
    const result = await listDirectoryTool.execute('.', { cwd: dir, traceId: 't' });
    const names = result.entries.map((e) => e.name).sort();
    expect(names).toEqual(['file.txt', 'subdir']);
    const file = result.entries.find((e) => e.name === 'file.txt');
    const sub = result.entries.find((e) => e.name === 'subdir');
    expect(file?.type).toBe('file');
    expect(sub?.type).toBe('directory');
  });
});
