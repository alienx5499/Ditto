import { input } from '@inquirer/prompts';
import chalk from 'chalk';

import { glyphs, isColor, theme } from './theme.js';

// ─── State ────────────────────────────────────────────────────────────────────
let _turnIndex = 0;

/** Resets the turn counter (call when starting a new session). */
export function resetTurnIndex(): void {
  _turnIndex = 0;
}

// ─── Visual prefix ────────────────────────────────────────────────────────────

/**
 * Builds a two-line prompt header printed *before* the readline:
 *
 *   ╭─ you  #3  ─────────────────────────────────────────
 *   ╰❯
 */
function renderPromptHeader(turnIndex: number, context?: string): void {
  const turnPill = isColor ? chalk.dim(`#${turnIndex}`) : `#${turnIndex}`;

  const label = theme.prompt('you');
  const ctxPart = context ? `  ${theme.muted(context)}` : '';
  const rightEdge = theme.dim(glyphs.divider.repeat(Math.max(4, 56)));

  console.log('');
  console.log(`${theme.dim('╭─')} ${label}  ${turnPill}${ctxPart}  ${rightEdge}`);
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

export interface PromptOptions {
  /** Short context string shown on the header line (e.g. active file). */
  context?: string;
  /** Override the default label. */
  label?: string;
}

/**
 * Prompts the user for a single line with a styled, two-line visual prefix.
 *
 * - Shows a turn counter that increments on each call.
 * - Optionally shows a `context` hint (active file, mode, etc.).
 * - Returns the trimmed input string.
 * - Re-throws `ExitPromptError` (Ctrl+C / Ctrl+D) unchanged so callers
 *   can decide whether to exit or continue.
 *
 * @example
 * const text = await promptUser({ context: 'editing src/index.ts' });
 */
export async function promptUser(options: PromptOptions | string = {}): Promise<string> {
  // Back-compat: accept a plain label string
  const opts: PromptOptions = typeof options === 'string' ? { label: options } : options;

  _turnIndex += 1;
  renderPromptHeader(_turnIndex, opts.context);

  const answer = await input({
    message: theme.prompt(`${theme.dim('╰')}${theme.prompt(glyphs.right)}`),
    theme: {
      prefix: '', // suppress inquirer's own "?" prefix
    },
  });

  return answer.trim();
}
