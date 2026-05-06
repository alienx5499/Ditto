import { describe, expect, it } from 'vitest';

import { ParseError } from '../../src/errors/index.js';
import { parseLlmJson, stringifyForLog } from '../../src/utils/safe-json.js';

describe('parseLlmJson', () => {
  it('parses plain JSON', () => {
    expect(parseLlmJson('{"step":"START","content":"hi"}')).toEqual({
      step: 'START',
      content: 'hi',
    });
  });

  it('strips markdown code fences', () => {
    const raw = '```json\n{"step":"THINK","content":"x"}\n```';
    expect(parseLlmJson(raw)).toEqual({ step: 'THINK', content: 'x' });
  });

  it('extracts JSON when surrounded by prose', () => {
    const raw = 'Sure. Here is the step:\n{"step":"START","content":"hi"}\nLet me know!';
    expect(parseLlmJson(raw)).toEqual({ step: 'START', content: 'hi' });
  });

  it('extracts first valid JSON object when multiple are present', () => {
    const raw =
      'I will think first.\n{"step":"THINK","content":"plan"}\n{"step":"TOOL","tool_name":"x","tool_args":{}}';
    expect(parseLlmJson(raw)).toEqual({ step: 'THINK', content: 'plan' });
  });

  it('throws ParseError on empty input', () => {
    expect(() => parseLlmJson('   ')).toThrow(ParseError);
  });

  it('throws ParseError on garbage', () => {
    expect(() => parseLlmJson('this is not json at all')).toThrow(ParseError);
  });
});

describe('stringifyForLog', () => {
  it('passes strings through under the limit', () => {
    expect(stringifyForLog('hi', 100)).toBe('hi');
  });

  it('truncates strings over the limit', () => {
    const big = 'a'.repeat(50);
    const out = stringifyForLog(big, 10);
    expect(out.startsWith('aaaaaaaaaa')).toBe(true);
    expect(out).toContain('+40 chars');
  });

  it('JSON-stringifies objects', () => {
    expect(stringifyForLog({ a: 1 })).toBe('{"a":1}');
  });
});
