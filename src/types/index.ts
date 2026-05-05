/**
 * Shared types used across Ditto.
 */

export type ChatRole = 'user' | 'assistant' | 'developer';

export interface InlineImage {
  mimeType: string;
  data: string;
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
  images?: InlineImage[];
}

export type GeminiRole = 'user' | 'model';

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export interface GeminiContent {
  role: GeminiRole;
  parts: GeminiPart[];
}

export type AgentStepKind = 'START' | 'THINK' | 'TOOL' | 'OBSERVE' | 'OUTPUT';

export interface AgentStep {
  step: AgentStepKind;
  content?: string;
  tool_name?: string;
  tool_args?: unknown;
}

export interface ToolExecutionContext {
  signal?: AbortSignal;
  cwd: string;
  traceId: string;
}

export interface ToolDescriptor<TArgs = unknown, TResult = unknown> {
  name: string;
  description: string;
  parametersJsonSchema: Record<string, unknown>;
  execute(args: TArgs, ctx: ToolExecutionContext): Promise<TResult>;
}

export interface ProviderUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface ProviderResult {
  text: string;
  modelUsed: string;
  latencyMs: number;
  usage?: ProviderUsage;
}

export interface ResolvedConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  location: string;
  primaryModel: string;
  fallbackModels: string[];
  budgetMs: number;
  version: string;
}
