import { Agent } from '../core/agent.js';
import { ConfigError } from '../errors/index.js';
import { buildSystemPrompt } from '../prompts/system-prompt.js';
import type { ILLMProvider } from '../providers/llm-provider.js';
import { loadImageAsInlineImage } from '../clone/screenshot.js';
import { siteSlugFromUrl } from '../clone/slug.js';
import type { ToolRegistry } from '../tools/registry.js';
import { theme } from '../ui/theme.js';
import type { InlineImage, ResolvedConfig } from '../types/index.js';

export interface CloneDeps {
  provider: ILLMProvider;
  registry: ToolRegistry;
  config: ResolvedConfig;
  url: string;
  screenshotPath?: string;
}

function normalizeCloneUrl(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * One-shot pipeline for cloning a public homepage.
 *
 * Builds a focused user prompt that nudges the model to call `extractSite`
 * first, then writes index/styles/script under output/<slug>/, and finally
 * opens the result in the browser. Optional screenshot is attached as an
 * inline image part on the first user turn.
 */
export async function runClone(deps: CloneDeps): Promise<void> {
  const normalizedUrl = normalizeCloneUrl(deps.url);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    throw new ConfigError(`Invalid URL: ${deps.url}`, { code: 'CLONE_BAD_URL' });
  }
  if (!/^https?:$/.test(parsedUrl.protocol)) {
    throw new ConfigError(`Only http(s) URLs are supported. Got: ${deps.url}`, {
      code: 'CLONE_BAD_PROTOCOL',
    });
  }

  const slug = siteSlugFromUrl(normalizedUrl);
  const images: InlineImage[] = [];
  if (deps.screenshotPath) {
    images.push(loadImageAsInlineImage(deps.screenshotPath));
    console.log(theme.muted(`attached screenshot: ${deps.screenshotPath}`));
  }

  const tools = deps.registry.list();
  const systemPrompt = buildSystemPrompt(tools);
  const agent = new Agent({
    provider: deps.provider,
    registry: deps.registry,
    systemPrompt,
    config: deps.config,
  });

  const prompt =
    `Clone the homepage at ${normalizedUrl}. Output to output/${slug}/ ` +
    `with index.html, styles.css, and script.js. Use the extractSite tool first to ` +
    `gather the SiteBrief, then synthesize the page using only the copy and palette ` +
    `from that brief. End by opening output/${slug}/index.html in the browser.`;

  console.log(theme.muted(`you › ${prompt}\n`));

  const abortController = new AbortController();
  process.on('SIGINT', () => abortController.abort());
  await agent.runTurn(prompt, {
    signal: abortController.signal,
    ...(images.length > 0 ? { images } : {}),
  });
  console.log('');
}
