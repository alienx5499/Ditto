import type { ChatMessage, GeminiContent, GeminiPart, InlineImage } from '../types/index.js';

/**
 * Append-only conversation history. Maps internal {@link ChatMessage}s to the
 * Gemini `contents` shape on demand.
 *
 * Note: Gemini accepts `user` and `model` roles only. Ditto's "developer"
 * messages (tool observations) are surfaced as `user` turns so the model sees
 * them as world-state updates.
 */
export class Conversation {
  private readonly messages: ChatMessage[] = [];

  push(message: ChatMessage): void {
    this.messages.push(message);
  }

  pushUser(content: string): void {
    this.push({ role: 'user', content });
  }

  pushUserWithImages(content: string, images: InlineImage[]): void {
    if (images.length === 0) {
      this.push({ role: 'user', content });
      return;
    }
    this.push({ role: 'user', content, images });
  }

  pushAssistant(content: string): void {
    this.push({ role: 'assistant', content });
  }

  pushDeveloper(content: string): void {
    this.push({ role: 'developer', content });
  }

  list(): readonly ChatMessage[] {
    return this.messages;
  }

  reset(): void {
    this.messages.length = 0;
  }

  /**
   * Maps history to Gemini `contents`. The system prompt is passed in as a
   * leading user/model pair to anchor instructions, since the public Vertex
   * `:generateContent` endpoint accepts `systemInstruction` separately - but
   * inlining it as the first user turn works reliably across all models.
   */
  toGeminiContents(systemPrompt: string): GeminiContent[] {
    const contents: GeminiContent[] = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I will follow the protocol.' }] },
    ];
    for (const msg of this.messages) {
      if (msg.role === 'assistant') {
        contents.push({ role: 'model', parts: [{ text: msg.content }] });
      } else {
        const parts: GeminiPart[] = [{ text: msg.content }];
        if (msg.images && msg.images.length > 0) {
          for (const img of msg.images) {
            parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
          }
        }
        contents.push({ role: 'user', parts });
      }
    }
    return contents;
  }
}
