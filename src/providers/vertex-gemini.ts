import { GoogleAuth } from 'google-auth-library';

import { ProviderError } from '../errors/index.js';
import type { GeminiContent, ProviderResult, ResolvedConfig } from '../types/index.js';
import { retry } from '../utils/retry.js';
import { getLogger } from '../utils/logger.js';
import type { ILLMProvider } from './llm-provider.js';

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
    safetyRatings?: unknown;
  }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
];

const GENERATION_CONFIG = {
  temperature: 0.4,
  topP: 0.95,
  maxOutputTokens: 4096,
  responseMimeType: 'application/json',
};

/**
 * Vertex AI Gemini provider. Uses google-auth-library + raw REST fetch.
 *
 * - Tries `primaryModel` first, then walks `fallbackModels` on 4xx/5xx that
 *   look like model availability errors (404, 400 with model-not-found).
 * - Each model call is retried up to 3 times on 429/5xx with exponential backoff.
 */
export class VertexGeminiProvider implements ILLMProvider {
  private readonly auth: GoogleAuth;
  private readonly modelChain: string[];

  constructor(private readonly config: ResolvedConfig) {
    this.auth = new GoogleAuth({
      credentials: {
        client_email: config.clientEmail,
        private_key: config.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    this.modelChain = [config.primaryModel, ...config.fallbackModels];
  }

  async generate(
    contents: GeminiContent[],
    options: { signal?: AbortSignal } = {},
  ): Promise<ProviderResult> {
    const logger = getLogger();
    const tokenResult: unknown = await this.auth.getAccessToken();
    let token: string | undefined;
    if (typeof tokenResult === 'string') {
      token = tokenResult;
    } else if (tokenResult && typeof tokenResult === 'object' && 'token' in tokenResult) {
      const t = (tokenResult as { token?: unknown }).token;
      if (typeof t === 'string') token = t;
    }
    if (!token) {
      throw new ProviderError('Failed to obtain Google access token', { code: 'PROVIDER_AUTH' });
    }

    let lastError: unknown;
    for (const model of this.modelChain) {
      try {
        const started = Date.now();
        const data = await retry<GeminiResponse>(
          () => this.callModel(model, contents, token, options.signal),
          {
            attempts: 3,
            baseDelayMs: 600,
            shouldRetry: (err) => isRetryable(err),
            onRetry: (err, attempt, delay) => {
              logger.warn({ model, attempt, delay, error: errorMessage(err) }, 'gemini retry');
            },
            ...(options.signal ? { signal: options.signal } : {}),
          },
        );
        const text =
          data.candidates?.[0]?.content?.parts
            ?.map((p) => p?.text)
            .filter((t): t is string => typeof t === 'string')
            .join('') ?? '';

        if (!text) {
          const finish = data.candidates?.[0]?.finishReason ?? 'unknown';
          const block = data.promptFeedback?.blockReason ?? 'none';
          throw new ProviderError(
            `Empty completion from ${model} (finish=${finish}, block=${block})`,
            { code: 'PROVIDER_EMPTY', httpStatus: 200 },
          );
        }

        const result: ProviderResult = {
          text,
          modelUsed: model,
          latencyMs: Date.now() - started,
        };
        const inputTokens = data.usageMetadata?.promptTokenCount;
        const outputTokens = data.usageMetadata?.candidatesTokenCount;
        if (inputTokens !== undefined || outputTokens !== undefined) {
          result.usage = {
            ...(inputTokens !== undefined ? { inputTokens } : {}),
            ...(outputTokens !== undefined ? { outputTokens } : {}),
          };
        }
        return result;
      } catch (error) {
        lastError = error;
        if (!isModelUnavailable(error)) {
          throw error instanceof ProviderError
            ? error
            : new ProviderError(errorMessage(error), {
                code: 'PROVIDER_FAILURE',
                cause: error,
              });
        }
        logger.warn(
          { model, error: errorMessage(error) },
          'gemini model unavailable, falling back',
        );
      }
    }
    throw new ProviderError(
      'All Gemini models in fallback chain failed. Last error: ' + errorMessage(lastError),
      { code: 'PROVIDER_ALL_MODELS_FAILED', cause: lastError },
    );
  }

  private async callModel(
    model: string,
    contents: GeminiContent[],
    token: string,
    signal?: AbortSignal,
  ): Promise<GeminiResponse> {
    const url = `https://aiplatform.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${model}:generateContent`;

    const requestInit: RequestInit = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: GENERATION_CONFIG,
        safetySettings: SAFETY_SETTINGS,
      }),
      ...(signal ? { signal } : {}),
    };

    const res = await fetch(url, requestInit);
    const raw = await res.text();
    let data: unknown = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // Ignore JSON parse failures; we still include raw response in error.
    }
    if (!res.ok) {
      throw new ProviderError(`HTTP ${res.status} from ${model}: ${truncate(raw, 600)}`, {
        code: 'PROVIDER_HTTP',
        httpStatus: res.status,
        cause: data,
      });
    }
    return (data ?? {}) as GeminiResponse;
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof ProviderError) {
    if (err.code === 'PROVIDER_EMPTY') return true;
    if (err.httpStatus !== undefined) {
      return err.httpStatus === 429 || err.httpStatus >= 500;
    }
  }
  return false;
}

function isModelUnavailable(err: unknown): boolean {
  if (err instanceof ProviderError && err.httpStatus !== undefined) {
    if (err.httpStatus === 404) return true;
    if (err.httpStatus === 400 && err.message.toLowerCase().includes('model')) return true;
    if (err.httpStatus === 403) return true;
  }
  return false;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
