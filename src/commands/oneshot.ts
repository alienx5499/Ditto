import { Agent } from '../core/agent.js';
import { buildSystemPrompt } from '../prompts/system-prompt.js';
import type { ILLMProvider } from '../providers/llm-provider.js';
import type { ToolRegistry } from '../tools/registry.js';
import { theme } from '../ui/theme.js';
import type { ResolvedConfig } from '../types/index.js';

export interface OneShotDeps {
  provider: ILLMProvider;
  registry: ToolRegistry;
  config: ResolvedConfig;
  prompt: string;
}

/**
 * Run exactly one agent turn from a CLI flag. Useful for demos, CI, and screencasts.
 */
export async function runOneShot(deps: OneShotDeps): Promise<void> {
  const tools = deps.registry.list();
  const systemPrompt = buildSystemPrompt(tools);
  const agent = new Agent({
    provider: deps.provider,
    registry: deps.registry,
    systemPrompt,
    config: deps.config,
  });

  console.log(theme.muted(`you › ${deps.prompt}\n`));

  const abortController = new AbortController();
  process.on('SIGINT', () => abortController.abort());
  await agent.runTurn(deps.prompt, { signal: abortController.signal });
  console.log('');
}
