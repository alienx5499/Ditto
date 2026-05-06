import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Agent } from '../../src/core/agent.js';
import type { ILLMProvider } from '../../src/providers/llm-provider.js';
import { createDefaultRegistry } from '../../src/tools/index.js';
import type { ProviderResult, ResolvedConfig } from '../../src/types/index.js';

class CannedProvider implements ILLMProvider {
  private idx = 0;
  constructor(private readonly script: string[]) {}
  async generate(): Promise<ProviderResult> {
    const text = this.script[this.idx] ?? '{"step":"OUTPUT","content":"done"}';
    this.idx += 1;
    return { text, modelUsed: 'mock', latencyMs: 1 };
  }
}

const config: ResolvedConfig = {
  projectId: 'p',
  clientEmail: 'svc@p.iam.gserviceaccount.com',
  privateKey: 'k',
  location: 'global',
  primaryModel: 'mock',
  fallbackModels: [],
  budgetMs: 60_000,
  version: '0.0.0-test',
};

let dir: string;
const ORIGINAL_CWD = process.cwd();

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ditto-int-'));
  process.chdir(dir);
});

afterEach(() => {
  process.chdir(ORIGINAL_CWD);
  rmSync(dir, { recursive: true, force: true });
});

describe('Agent end-to-end', () => {
  it('runs a START -> THINK -> TOOL -> THINK -> OUTPUT loop and writes a file', async () => {
    const provider = new CannedProvider([
      JSON.stringify({ step: 'START', content: 'plan' }),
      JSON.stringify({ step: 'THINK', content: 'I will write a file' }),
      JSON.stringify({
        step: 'TOOL',
        tool_name: 'writeFile',
        tool_args: { path: 'demo/hello.txt', contents: 'hi' },
      }),
      JSON.stringify({ step: 'THINK', content: 'File written' }),
      JSON.stringify({ step: 'OUTPUT', content: 'all done' }),
    ]);
    const registry = createDefaultRegistry();
    const agent = new Agent({ provider, registry, systemPrompt: 'SYSTEM', config });

    const output = await agent.runTurn('Write demo/hello.txt with "hi"');
    expect(output).toBe('all done');
    expect(readFileSync(join(dir, 'demo/hello.txt'), 'utf8')).toBe('hi');
  });

  it('self-heals when a tool reports an error', async () => {
    const provider = new CannedProvider([
      JSON.stringify({ step: 'START', content: 'plan' }),
      JSON.stringify({
        step: 'TOOL',
        tool_name: 'readFile',
        tool_args: { path: 'missing.txt' },
      }),
      JSON.stringify({ step: 'THINK', content: 'It does not exist; will write instead' }),
      JSON.stringify({
        step: 'TOOL',
        tool_name: 'writeFile',
        tool_args: { path: 'created.txt', contents: 'hello' },
      }),
      JSON.stringify({ step: 'OUTPUT', content: 'recovered and wrote file' }),
    ]);
    const registry = createDefaultRegistry();
    const agent = new Agent({ provider, registry, systemPrompt: 'SYSTEM', config });

    const output = await agent.runTurn('Recover from missing file');
    expect(output).toBe('recovered and wrote file');
    expect(readFileSync(join(dir, 'created.txt'), 'utf8')).toBe('hello');
  });

  it('asks model to retry when JSON is malformed, then continues', async () => {
    const provider = new CannedProvider([
      'not json',
      JSON.stringify({ step: 'START', content: 'plan' }),
      JSON.stringify({ step: 'OUTPUT', content: 'fine' }),
    ]);
    const registry = createDefaultRegistry();
    const agent = new Agent({ provider, registry, systemPrompt: 'SYSTEM', config });
    const output = await agent.runTurn('test');
    expect(output).toBe('fine');
  });

  it('recovers after repeated malformed JSON without crashing the turn', async () => {
    const provider = new CannedProvider([
      'not json',
      'still not json',
      '```text\nnot json\n```',
      JSON.stringify({ step: 'THINK', content: 'recovered format' }),
      JSON.stringify({ step: 'OUTPUT', content: 'done after recovery' }),
    ]);
    const registry = createDefaultRegistry();
    const agent = new Agent({ provider, registry, systemPrompt: 'SYSTEM', config });
    const output = await agent.runTurn('test malformed recovery');
    expect(output).toBe('done after recovery');
  });
});
