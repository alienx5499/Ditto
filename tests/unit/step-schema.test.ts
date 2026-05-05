import { describe, expect, it } from 'vitest';

import { stepUnionSchema } from '../../src/schemas/step.js';

describe('stepUnionSchema', () => {
  it('accepts a START step', () => {
    expect(stepUnionSchema.parse({ step: 'START', content: 'hi' }).step).toBe('START');
  });

  it('accepts a TOOL step with object args', () => {
    const parsed = stepUnionSchema.parse({
      step: 'TOOL',
      tool_name: 'writeFile',
      tool_args: { path: 'a.txt', contents: 'x' },
    });
    expect(parsed.step).toBe('TOOL');
  });

  it('rejects START without content', () => {
    const result = stepUnionSchema.safeParse({ step: 'START' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown step kind', () => {
    const result = stepUnionSchema.safeParse({ step: 'WAT', content: 'x' });
    expect(result.success).toBe(false);
  });
});
