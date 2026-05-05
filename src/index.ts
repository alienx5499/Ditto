import { loadConfig } from './config/env.js';
import { VertexGeminiProvider } from './providers/vertex-gemini.js';
import { createDefaultRegistry } from './tools/index.js';
import { renderBanner } from './ui/banner.js';
import { renderError } from './ui/step-renderer.js';
import { theme } from './ui/theme.js';
import { runChat } from './commands/chat.js';
import { runDoctor } from './commands/doctor.js';
import { ConfigError, DittoError } from './errors/index.js';

interface ParsedArgs {
  command: 'chat' | 'doctor' | 'clone' | 'help' | 'version';
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  let command: ParsedArgs['command'] = 'chat';
  let commandSet = false;

  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === undefined) continue;
    if (a === '--version' || a === '-v') {
      command = 'version';
      continue;
    }
    if (a === '--help' || a === '-h') {
      command = 'help';
      continue;
    }
    if (!commandSet && (a === 'doctor' || a === 'chat' || a === 'clone')) {
      command = a;
      commandSet = true;
      continue;
    }
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
      continue;
    }
    positional.push(a);
  }
  return { command, positional, flags };
}

function withFlagModelOverride(
  config: ReturnType<typeof loadConfig>,
  flags: Record<string, string | boolean>,
): ReturnType<typeof loadConfig> {
  const model = flags['model'];
  if (typeof model !== 'string' || model.trim().length === 0) return config;
  const primaryModel = model.trim();
  const fallbackModels = [
    ...config.fallbackModels.filter((m) => m !== primaryModel),
    config.primaryModel !== primaryModel ? config.primaryModel : '',
  ].filter((m) => m.length > 0);
  return { ...config, primaryModel, fallbackModels };
}

const HELP_TEXT = `
Usage:
  ditto                                     Start interactive chat (default)
  ditto chat                                Same as above
  ditto doctor                              Run a health check (gcp.json, model reachability)
  ditto clone <url> [--screenshot path]     Clone any public homepage to output/<slug>/
  ditto --model <gemini-model-id>           Override primary model for this run
  ditto --prompt "<task>"                   Run one non-interactive turn and exit
  ditto --version                           Print version
  ditto --help                              Show this help
`;

export async function main(argv: string[] = process.argv): Promise<number> {
  const { command, positional, flags } = parseArgs(argv);

  if (command === 'help') {
    console.log(HELP_TEXT);
    return 0;
  }

  let config;
  try {
    config = loadConfig();
    config = withFlagModelOverride(config, flags);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.log(
        renderBanner({
          version: '0.1.0',
          model: 'gemini-3.1-pro',
          location: 'global',
        }),
      );
      renderError(err);
      console.log(
        theme.muted(
          'Place your service account file at ./gcp.json and try again. See README for details.',
        ),
      );
      return 2;
    }
    renderError(err instanceof Error ? err : new Error(String(err)));
    return 2;
  }

  if (command === 'version') {
    console.log(`ditto v${config.version}`);
    return 0;
  }

  console.log(
    renderBanner({
      version: config.version,
      model: config.primaryModel,
      location: config.location,
    }),
  );

  if (command === 'doctor') {
    return runDoctor();
  }

  const provider = new VertexGeminiProvider(config);
  const registry = createDefaultRegistry();

  if (command === 'clone') {
    const url = positional[0];
    if (!url) {
      console.error(theme.error('Usage: ditto clone <url> [--screenshot path]'));
      return 2;
    }
    const screenshotFlag = flags['screenshot'];
    try {
      const { runClone } = await import('./commands/clone.js');
      await runClone({
        provider,
        registry,
        config,
        url,
        ...(typeof screenshotFlag === 'string' ? { screenshotPath: screenshotFlag } : {}),
      });
      return 0;
    } catch (err) {
      renderError(err instanceof Error ? err : new Error(String(err)));
      return 1;
    }
  }

  const promptFlag = flags['prompt'];
  if (typeof promptFlag === 'string' && promptFlag.length > 0) {
    try {
      const { runOneShot } = await import('./commands/oneshot.js');
      await runOneShot({ provider, registry, config, prompt: promptFlag });
      return 0;
    } catch (err) {
      renderError(err instanceof Error ? err : new Error(String(err)));
      return 1;
    }
  }

  try {
    await runChat({ provider, registry, config });
    return 0;
  } catch (err) {
    if (err instanceof DittoError) {
      renderError(err);
      return 1;
    }
    renderError(err instanceof Error ? err : new Error(String(err)));
    return 1;
  }
}
