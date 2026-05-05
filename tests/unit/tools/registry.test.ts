import { describe, expect, it } from 'vitest';

import { ToolError } from '../../../src/errors/index.js';
import { ToolRegistry } from '../../../src/tools/registry.js';
import type { ToolDescriptor } from '../../../src/types/index.js';

const echoTool: ToolDescriptor<{ msg: string }, { echoed: string }> = {
  name: 'echo',
  description: 'echo',
  parametersJsonSchema: {},
  async execute(args) {
    return { echoed: args.msg };
  },
};

describe('ToolRegistry', () => {
  it('registers and executes a tool', async () => {
    const reg = new ToolRegistry();
    reg.register(echoTool as unknown as ToolDescriptor);
    expect(reg.has('echo')).toBe(true);
    const result = (await reg.execute(
      'echo',
      { msg: 'hi' },
      {
        cwd: process.cwd(),
        traceId: 't',
      },
    )) as { echoed: string };
    expect(result.echoed).toBe('hi');
  });

  it('throws ToolError for unknown tool', async () => {
    const reg = new ToolRegistry();
    await expect(
      reg.execute('nope', null, { cwd: process.cwd(), traceId: 't' }),
    ).rejects.toBeInstanceOf(ToolError);
  });
});
