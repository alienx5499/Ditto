import { Agent } from '../core/agent.js';
import { renderError } from '../ui/step-renderer.js';
import { promptUser } from '../ui/input.js';
import { theme } from '../ui/theme.js';
import { getSessionLogPath } from '../utils/logger.js';
import { ToolError } from '../errors/index.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { ILLMProvider } from '../providers/llm-provider.js';
import type { ResolvedConfig } from '../types/index.js';
import { buildSystemPrompt } from '../prompts/system-prompt.js';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ChatDeps {
  provider: ILLMProvider;
  registry: ToolRegistry;
  config: ResolvedConfig;
}

const HELP_TEXT = `
Slash commands:
  /clone <url>  - clone any public homepage to output/<slug>/
  /clear        - reset the conversation
  /save         - print the current session log path
  /open <slug>  - open output/<slug>/index.html (default: scaler-com)
  /help         - show this help
  /exit         - quit Ditto
`;

/**
 * Interactive REPL: read a line, run an agent turn, repeat.
 * Slash commands operate locally without invoking the model.
 */
export async function runChat(deps: ChatDeps): Promise<void> {
  const tools = deps.registry.list();
  const systemPrompt = buildSystemPrompt(tools);
  const agent = new Agent({
    provider: deps.provider,
    registry: deps.registry,
    systemPrompt,
    config: deps.config,
  });

  console.log(theme.muted('Type your instruction. Type /help for slash commands.\n'));

  const abortController = new AbortController();
  process.on('SIGINT', () => {
    abortController.abort();
  });

  for (;;) {
    let input: string;
    try {
      input = await promptUser('you ›');
    } catch {
      console.log(theme.muted('\nGoodbye.'));
      return;
    }
    if (!input) continue;

    const cmd = input.toLowerCase();
    if (cmd === '/exit' || cmd === '/quit') {
      console.log(theme.muted('Goodbye.'));
      return;
    }
    if (cmd === '/help') {
      console.log(theme.muted(HELP_TEXT));
      continue;
    }
    if (cmd === '/clear') {
      agent.resetConversation();
      console.log(theme.success('Conversation cleared.'));
      continue;
    }
    if (cmd === '/save') {
      console.log(theme.muted(`Session log: ${getSessionLogPath()}`));
      continue;
    }
    if (cmd.startsWith('/open')) {
      const parts = input.split(/\s+/);
      const slug = parts[1] ?? 'scaler-com';
      const target = resolve(process.cwd(), 'output', slug, 'index.html');
      if (existsSync(target)) {
        spawn(openCommand(), [target], { detached: true, stdio: 'ignore' }).unref();
        console.log(theme.success(`Opened ${target}`));
      } else {
        console.log(theme.muted(`No site found at ${target} yet.`));
      }
      continue;
    }
    if (cmd.startsWith('/clone')) {
      const parts = input.split(/\s+/).filter(Boolean);
      const url = parts[1];
      if (!url) {
        console.log(theme.muted('Usage: /clone https://example.com'));
        continue;
      }
      const directive =
        `Clone the homepage at ${url}. Use the extractSite tool first, then ` +
        `write index.html/styles.css/script.js under output/<slug>/ and open the page.`;
      try {
        await agent.runTurn(directive, { signal: abortController.signal });
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        renderError(e);
      }
      console.log('');
      continue;
    }

    try {
      await agent.runTurn(input, { signal: abortController.signal });
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      renderError(e);
      if (err instanceof ToolError) {
        console.log(theme.muted('Tool failed. You can ask Ditto to retry differently.'));
      }
    }
    console.log('');
  }
}

function openCommand(): string {
  if (process.platform === 'darwin') return 'open';
  if (process.platform === 'win32') return 'start';
  return 'xdg-open';
}
