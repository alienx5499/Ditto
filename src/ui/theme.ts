import chalk from 'chalk';

// ─── Environment ──────────────────────────────────────────────────────────────
export const isColor = !process.env['NO_COLOR'] && process.stdout.isTTY !== false;
export const termWidth = process.stdout.columns ?? 100;

const id = (s: string): string => s;
const c = (fn: (s: string) => string): ((s: string) => string) => (isColor ? fn : id);

// ─── Color Palette (semantic → hex) ───────────────────────────────────────────
const palette = {
  // Brand
  brand: '#FF6FB1',
  brandSoft: '#FF6FB180',
  accent: '#67E8F9',
  accentSoft: '#67E8F940',
  violet: '#A78BFA',
  violetSoft: '#A78BFA40',
  // States
  start: '#22D3EE',
  think: '#A78BFA',
  tool: '#F59E0B',
  observe: '#34D399',
  output: '#F8FAFC',
  success: '#4ADE80',
  error: '#F87171',
  warn: '#FBBF24',
  info: '#38BDF8',
  // Neutral
  muted: '#6B7280',
  dim: '#374151',
  subtle: '#9CA3AF',
  white: '#F8FAFC',
  // Costs / latency
  fast: '#4ADE80',
  medium: '#FBBF24',
  slow: '#F87171',
} as const;

// ─── Core theme tokens ─────────────────────────────────────────────────────────
export const theme = {
  // Brand / UI
  brand: c(chalk.hex(palette.brand).bold),
  accent: c(chalk.hex(palette.accent)),
  violet: c(chalk.hex(palette.violet).italic),
  prompt: c(chalk.hex(palette.info).bold),
  reply: c(chalk.hex(palette.brand).bold),

  // Step types
  start: c(chalk.hex(palette.start).bold),
  think: c(chalk.hex(palette.think).italic),
  tool: c(chalk.hex(palette.tool).bold),
  observe: c(chalk.hex(palette.observe).bold),
  output: c(chalk.bold.hex(palette.output)),

  // Status
  success: c(chalk.hex(palette.success).bold),
  error: c(chalk.hex(palette.error).bold),
  warn: c(chalk.hex(palette.warn).bold),
  info: c(chalk.hex(palette.info)),

  // Neutrals
  muted: c(chalk.hex(palette.muted)),
  subtle: c(chalk.hex(palette.subtle)),
  dim: c(chalk.dim.hex(palette.muted)),
  white: c(chalk.hex(palette.white)),
  bold: c(chalk.bold),
} as const;

// ─── Glyph sets ───────────────────────────────────────────────────────────────
export const glyphs = {
  // Step lane markers
  start: '◉',
  think: '◇',
  tool: '⬡',
  observe: '✦',
  output: '◆',
  // UI structure
  separator: '│',
  connector: '├',
  corner: '└',
  bullet: '·',
  arrow: '→',
  check: '✓',
  cross: '✗',
  warn: '⚠',
  info: 'ℹ',
  dot: '•',
  ellipsis: '…',
  // Decorative
  left: '❮',
  right: '❯',
  divider: '─',
} as const;

// ─── Badge / pill helpers ──────────────────────────────────────────────────────
type BadgeStyle =
  | 'start'
  | 'think'
  | 'tool'
  | 'observe'
  | 'output'
  | 'success'
  | 'error'
  | 'warn'
  | 'info'
  | 'muted';

const badgeFn: Record<BadgeStyle, (s: string) => string> = {
  start: theme.start,
  think: theme.think,
  tool: theme.tool,
  observe: theme.observe,
  output: theme.output,
  success: theme.success,
  error: theme.error,
  warn: theme.warn,
  info: theme.info,
  muted: theme.muted,
};

/**
 * Renders ❮ LABEL ❯ badge in the given style.
 */
export function badge(label: string, style: BadgeStyle = 'muted'): string {
  const fn = badgeFn[style];
  return fn(`${glyphs.left} ${label} ${glyphs.right}`);
}

/**
 * Renders a pill: [ label ] dimmed, useful for metadata.
 */
export function pill(label: string): string {
  return theme.dim(`[${label}]`);
}

// ─── Latency coloring ─────────────────────────────────────────────────────────
export function latencyColor(ms: number): string {
  if (ms < 1800) return isColor ? chalk.hex(palette.fast).bold(`${ms}ms`) : `${ms}ms`;
  if (ms < 5000) return isColor ? chalk.hex(palette.medium).bold(`${ms}ms`) : `${ms}ms`;
  return isColor ? chalk.hex(palette.slow).bold(`${ms}ms`) : `${ms}ms`;
}

// ─── Horizontal rule ──────────────────────────────────────────────────────────
export function hr(width = termWidth, color: 'dim' | 'muted' = 'dim'): string {
  const line = glyphs.divider.repeat(Math.max(0, width));
  return color === 'dim' ? theme.dim(line) : theme.muted(line);
}

// ─── Timestamp helper ─────────────────────────────────────────────────────────
export function timestamp(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return theme.dim(`${h}:${m}:${s}`);
}

// ─── Token cost display ───────────────────────────────────────────────────────
export function formatTokens(input: number, output: number): string {
  const total = input + output;
  const totalStr = total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total);
  return theme.muted(`${totalStr} tok`) + theme.dim(` (↑${input} ↓${output})`);
}

// ─── Truncate with ellipsis ───────────────────────────────────────────────────
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + glyphs.ellipsis;
}
