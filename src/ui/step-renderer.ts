import boxen from 'boxen';

import type { ParsedStep } from '../schemas/step.js';
import { stringifyForLog } from '../utils/safe-json.js';
import {
  badge,
  formatTokens,
  glyphs,
  hr,
  latencyColor,
  termWidth,
  theme,
  timestamp,
  truncate,
} from './theme.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const TRUNCATE_AT = 700;
const LABEL_WIDTH = 7; // 'OBSERVE' is longest label

// ─── Lane rendering helpers ───────────────────────────────────────────────────

/** Left-pads a step label to a fixed width so content columns align. */
function stepLabel(text: string, colorFn: (s: string) => string): string {
  return colorFn(text.padEnd(LABEL_WIDTH));
}

/**
 * One lane row:  <ts>  <glyph> <LABEL>  │  <content>
 */
function lane(
  glyph: string,
  label: string,
  content: string,
  glyphFn: (s: string) => string,
  labelFn: (s: string) => string,
): string {
  const ts = timestamp();
  const g = glyphFn(glyph);
  const lbl = stepLabel(label, labelFn);
  const sep = theme.dim(glyphs.separator);
  return `${ts}  ${g} ${lbl}  ${sep}  ${content}`;
}

// ─── Step renderer ────────────────────────────────────────────────────────────

/**
 * Pretty-prints a single agent step in its own visual lane.
 * Each step type has a distinct glyph, label, color, and box style.
 */
export function renderStep(step: ParsedStep): void {
  switch (step.step) {
    // ── START ─────────────────────────────────────────────────────────────────
    case 'START': {
      console.log('');
      console.log(hr());
      console.log(lane(glyphs.start, 'START', theme.start(step.content), theme.start, theme.start));
      console.log(hr());
      return;
    }

    // ── THINK ─────────────────────────────────────────────────────────────────
    case 'THINK': {
      console.log(lane(glyphs.think, 'THINK', theme.think(step.content), theme.think, theme.think));
      return;
    }

    // ── TOOL ──────────────────────────────────────────────────────────────────
    case 'TOOL': {
      const args =
        step.tool_args !== undefined ? stringifyForLog(step.tool_args, 220) : '(no args)';
      const header = `${theme.tool(glyphs.tool)}  ${theme.tool(step.tool_name)}`;
      const argLine = theme.muted(truncate(args, 400));
      const ts = timestamp();

      const body = `${ts}  ${header}\n   ${theme.dim(glyphs.separator)}  ${argLine}`;

      const boxed = boxen(body, {
        padding: { top: 0, right: 2, bottom: 0, left: 1 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        borderStyle: 'round',
        borderColor: 'yellow',
        title: theme.tool(` ${glyphs.tool} TOOL `),
        titleAlignment: 'left',
      });
      console.log(boxed);
      return;
    }

    // ── OBSERVE ───────────────────────────────────────────────────────────────
    case 'OBSERVE': {
      const text = truncate(stringifyForLog(step.content, TRUNCATE_AT), TRUNCATE_AT);
      console.log(lane(glyphs.observe, 'OBSERVE', theme.muted(text), theme.observe, theme.observe));
      return;
    }

    // ── OUTPUT ────────────────────────────────────────────────────────────────
    case 'OUTPUT': {
      const boxed = boxen(theme.output(step.content), {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'magenta',
        title: theme.brand('  Ditto  '),
        titleAlignment: 'center',
        width: Math.min(termWidth - 2, 120),
      });
      console.log(`\n${boxed}\n`);
      return;
    }
  }
}

// ─── Turn footer ──────────────────────────────────────────────────────────────

export interface TurnMeta {
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  traceId: string;
  turnIndex?: number;
}

/**
 * Prints a compact metadata footer at the end of each agent turn.
 *
 * Example:
 *   ──────────────────────────────────
 *   ❮ #3 ❯  model=claude-…  latency=840ms  2.1k tok (↑1800 ↓320)  trace=abc12345
 */
export function renderTurnFooter(meta: TurnMeta): void {
  const turnBadge = meta.turnIndex !== undefined ? badge(`#${meta.turnIndex}`, 'muted') + '  ' : '';

  const modelPart = theme.dim(`model=`) + theme.subtle(meta.model);
  const latencyPart = theme.dim(`latency=`) + latencyColor(meta.latencyMs);
  const tokenPart =
    meta.inputTokens !== undefined && meta.outputTokens !== undefined
      ? formatTokens(meta.inputTokens, meta.outputTokens)
      : theme.dim('tok n/a');
  const tracePart = theme.dim(`trace=`) + theme.dim(meta.traceId.slice(0, 8));

  const sep = `  ${theme.dim(glyphs.bullet)}  `;
  const row = [modelPart, latencyPart, tokenPart, tracePart].join(sep);

  console.log(hr());
  console.log(`  ${turnBadge}${row}`);
  console.log('');
}

// ─── Error box ────────────────────────────────────────────────────────────────

/**
 * Renders a prominent framed error block.
 */
export function renderError(err: Error): void {
  const ts = timestamp();
  const body = [
    `${theme.error(err.message)}`,
    '',
    theme.dim(`${ts}  ${err.name}`),
    err.stack
      ? theme.dim(
          err.stack
            .split('\n')
            .slice(1, 4)
            .map((l) => l.trim())
            .join('\n'),
        )
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const boxed = boxen(body, {
    padding: 1,
    borderStyle: 'round',
    borderColor: 'red',
    title: theme.error(`  ${glyphs.cross} ${err.name}  `),
    titleAlignment: 'left',
    width: Math.min(termWidth - 2, 100),
  });
  console.error(`\n${boxed}\n`);
}

// ─── Session summary ──────────────────────────────────────────────────────────

export interface SessionSummary {
  turns: number;
  totalInputTok: number;
  totalOutputTok: number;
  totalLatencyMs: number;
  model: string;
}

/**
 * Prints a final session summary when the agent exits.
 *
 * ┌──────────────────────────────────────────┐
 * │   Session Summary                        │
 * │   Turns · Tokens · Avg latency · Model   │
 * └──────────────────────────────────────────┘
 */
export function renderSessionSummary(s: SessionSummary): void {
  const avgLatency = s.turns > 0 ? Math.round(s.totalLatencyMs / s.turns) : 0;

  const lines = [
    `${theme.brand('Session Summary')}`,
    '',
    `  ${theme.dim(glyphs.bullet)} Turns      ${theme.white(String(s.turns))}`,
    `  ${theme.dim(glyphs.bullet)} Tokens     ${formatTokens(s.totalInputTok, s.totalOutputTok)}`,
    `  ${theme.dim(glyphs.bullet)} Avg latency ${latencyColor(avgLatency)}`,
    `  ${theme.dim(glyphs.bullet)} Model      ${theme.subtle(s.model)}`,
  ].join('\n');

  const boxed = boxen(lines, {
    padding: 1,
    borderStyle: 'round',
    borderColor: 'magenta',
    width: Math.min(termWidth - 2, 60),
  });
  console.log(`\n${boxed}\n`);
}
