import type { GeminiContent, ProviderResult } from '../types/index.js';

/**
 * Provider abstraction. Anything that can map a list of Gemini-shaped
 * `contents` to a single text reply qualifies.
 */
export interface ILLMProvider {
  generate(contents: GeminiContent[], options?: { signal?: AbortSignal }): Promise<ProviderResult>;
}
