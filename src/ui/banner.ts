import figlet from 'figlet';
import gradient from 'gradient-string';

import { badge, glyphs, hr, isColor, pill, termWidth, theme } from './theme.js';

const TAGLINE = 'Copy anything. Build anything.';

export interface BannerInfo {
  version: string;
  model: string;
  location: string;
  sessionId?: string;
}

// ─── Session status bar ────────────────────────────────────────────────────────
function renderStatusBar(info: BannerInfo): string {
  const model = badge(info.model, 'info');
  const ver = pill(`v${info.version}`);
  const loc = pill(info.location);
  const sid = info.sessionId
    ? theme.dim(`session: ${info.sessionId.slice(0, 8)}…`)
    : theme.dim('session: local');

  const left = `  ${model}  ${ver}  ${loc}`;
  const right = sid;

  // right-align the session id if terminal is wide enough
  // Keep this simple and lint-safe: use raw string length.
  const leftLen = left.length;
  const rightLen = right.length;
  const gap = termWidth - leftLen - rightLen - 2;
  const spacer = gap > 0 ? ' '.repeat(gap) : '  ';

  return `${left}${spacer}${right}`;
}

// ─── Quick-help row ───────────────────────────────────────────────────────────
function renderHints(): string {
  const hints: Array<[string, string]> = [
    ['/clone <url>', 'scrape & clone a page'],
    ['/help', 'list all commands'],
    ['Ctrl+C', 'exit gracefully'],
  ];
  const parts = hints.map(
    ([cmd, desc]) => `${theme.accent(cmd)} ${theme.dim(glyphs.arrow)} ${theme.muted(desc)}`,
  );
  return `  ${parts.join(`  ${theme.dim(glyphs.bullet)}  `)}`;
}

/**
 * Renders the full boot banner:
 *   ┌ gradient DITTO figlet art
 *   ├ tagline + status bar (model / version / location / session)
 *   └ quick-help hints
 */
export function renderBanner(info: BannerInfo): string {
  const text = figlet.textSync('DITTO', { font: 'ANSI Shadow' });
  const colored = isColor ? gradient(['#67E8F9', '#A78BFA', '#FF6FB1'])(text) : text;

  const rule = hr(termWidth);
  const tagline = `\n  ${theme.brand(TAGLINE)}`;
  const status = renderStatusBar(info);
  const hints = renderHints();

  return ['', colored, tagline, '', `${rule}`, status, `${rule}`, hints, `${rule}`, ''].join('\n');
}
