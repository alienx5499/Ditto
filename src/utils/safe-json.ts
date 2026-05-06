import { ParseError } from '../errors/index.js';

const FENCE_RE = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;

function extractBalancedJsonObjects(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }

    if (ch === '}') {
      if (depth === 0) continue;
      depth -= 1;
      if (depth === 0 && start !== -1) {
        out.push(input.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return out;
}

/**
 * Tolerant JSON extraction for LLM output.
 *
 * Handles common failure modes:
 * - leading / trailing whitespace
 * - markdown code fences (```json ... ```)
 * - text before or after the JSON object
 * - mismatched braces from truncation (best-effort recovery)
 *
 * Throws {@link ParseError} when no valid JSON can be recovered.
 */
export function parseLlmJson<T = unknown>(raw: string): T {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new ParseError('Empty LLM response', raw);
  }

  const candidates: string[] = [];

  const fenceMatch = FENCE_RE.exec(trimmed);
  if (fenceMatch && fenceMatch[1]) {
    candidates.push(fenceMatch[1].trim());
  }

  candidates.push(trimmed);

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  candidates.push(...extractBalancedJsonObjects(trimmed));

  let lastError: unknown;
  for (const candidate of new Set(candidates)) {
    try {
      return JSON.parse(candidate) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw new ParseError('Could not parse LLM JSON output', raw, { cause: lastError });
}

/**
 * Compact, log-safe stringification (avoids dumping huge buffers).
 */
export function stringifyForLog(value: unknown, max = 2000): string {
  let str: string;
  try {
    str = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    str = String(value);
  }
  if (str.length > max) {
    return `${str.slice(0, max)}…[+${str.length - max} chars]`;
  }
  return str;
}
