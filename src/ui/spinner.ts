import ora, { type Ora } from 'ora';

import { glyphs, theme } from './theme.js';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DittoSpinner {
  /** Update the visible phase label (keeps elapsed timer ticking). */
  phase(text: string): void;
  /** Stop with a green ✓ success line. */
  succeed(text?: string): void;
  /** Stop with a red ✗ failure line. */
  fail(text: string): void;
  /** Stop with a ⚠ warning line. */
  warn(text: string): void;
  /** Stop the spinner silently (no final line). */
  stop(): void;
  /** The underlying ora instance for advanced use. */
  raw: Ora;
}

// ─── Elapsed ticker ───────────────────────────────────────────────────────────
function elapsedLabel(startMs: number): string {
  const s = ((Date.now() - startMs) / 1000).toFixed(1);
  return theme.dim(`${s}s`);
}

function buildText(phase: string, startMs: number): string {
  return `${theme.muted(phase)}  ${elapsedLabel(startMs)}`;
}

// ─── Factory ──────────────────────────────────────────────────────────────────
/**
 * Creates a Ditto-themed spinner with an elapsed-time ticker.
 *
 * @example
 * const sp = startSpinner('Fetching page…');
 * sp.phase('Parsing DOM…');
 * sp.succeed('Done');
 */
export function startSpinner(initialText: string): DittoSpinner {
  const startMs = Date.now();
  let currentPhase = initialText;

  const spinner = ora({
    text: buildText(initialText, startMs),
    color: 'magenta',
    spinner: 'aesthetic',
  }).start();

  // Tick the elapsed label every 100 ms
  const ticker = setInterval(() => {
    spinner.text = buildText(currentPhase, startMs);
  }, 100);

  function cleanup(): void {
    clearInterval(ticker);
  }

  return {
    raw: spinner,

    phase(text: string): void {
      currentPhase = text;
      spinner.text = buildText(text, startMs);
    },

    succeed(text?: string): void {
      cleanup();
      const elapsed = elapsedLabel(startMs);
      const msg = text ?? currentPhase;
      spinner.stopAndPersist({
        symbol: theme.success(glyphs.check),
        text: `${theme.success(msg)}  ${elapsed}`,
      });
    },

    fail(text: string): void {
      cleanup();
      const elapsed = elapsedLabel(startMs);
      spinner.stopAndPersist({
        symbol: theme.error(glyphs.cross),
        text: `${theme.error(text)}  ${elapsed}`,
      });
    },

    warn(text: string): void {
      cleanup();
      const elapsed = elapsedLabel(startMs);
      spinner.stopAndPersist({
        symbol: theme.warn(glyphs.warn),
        text: `${theme.warn(text)}  ${elapsed}`,
      });
    },

    stop(): void {
      cleanup();
      spinner.stop();
    },
  };
}
