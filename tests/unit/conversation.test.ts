import { describe, expect, it } from 'vitest';

import { Conversation } from '../../src/core/conversation.js';

describe('Conversation', () => {
  it('appends and lists messages in order', () => {
    const c = new Conversation();
    c.pushUser('hello');
    c.pushAssistant('hi');
    c.pushDeveloper('observe-result');
    expect(c.list()).toEqual([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
      { role: 'developer', content: 'observe-result' },
    ]);
  });

  it('reset() clears history', () => {
    const c = new Conversation();
    c.pushUser('x');
    c.reset();
    expect(c.list().length).toBe(0);
  });

  it('toGeminiContents prepends system prompt as user/model anchor', () => {
    const c = new Conversation();
    c.pushUser('build me a site');
    c.pushAssistant('{"step":"START","content":"ok"}');
    c.pushDeveloper('{"step":"OBSERVE","content":"done"}');

    const contents = c.toGeminiContents('SYSTEM');

    expect(contents[0]).toEqual({ role: 'user', parts: [{ text: 'SYSTEM' }] });
    expect(contents[1]?.role).toBe('model');
    expect(contents[2]).toEqual({
      role: 'user',
      parts: [{ text: 'build me a site' }],
    });
    expect(contents[3]).toEqual({
      role: 'model',
      parts: [{ text: '{"step":"START","content":"ok"}' }],
    });
    expect(contents[4]).toEqual({
      role: 'user',
      parts: [{ text: '{"step":"OBSERVE","content":"done"}' }],
    });
  });

  it('pushUserWithImages emits text + inlineData parts for that turn', () => {
    const c = new Conversation();
    c.pushUserWithImages('look at this screenshot', [
      { mimeType: 'image/png', data: 'BASE64DATA==' },
    ]);
    const contents = c.toGeminiContents('SYSTEM');
    const userTurn = contents[contents.length - 1];
    expect(userTurn?.role).toBe('user');
    expect(userTurn?.parts).toEqual([
      { text: 'look at this screenshot' },
      { inlineData: { mimeType: 'image/png', data: 'BASE64DATA==' } },
    ]);
  });

  it('pushUserWithImages with empty array falls back to plain text turn', () => {
    const c = new Conversation();
    c.pushUserWithImages('no images', []);
    const contents = c.toGeminiContents('SYSTEM');
    const last = contents[contents.length - 1];
    expect(last?.parts).toEqual([{ text: 'no images' }]);
  });
});
