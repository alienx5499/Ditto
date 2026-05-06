import { readFileSync, statSync } from 'node:fs';
import { extname, isAbsolute, resolve } from 'node:path';

import { ConfigError } from '../errors/index.js';
import type { InlineImage } from '../types/index.js';

const MAX_BYTES = 3.5 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/**
 * Reads a local image file and returns it as a base64 inline image suitable
 * for Gemini multimodal `inlineData` parts.
 *
 * Supported: png, jpg/jpeg, webp, gif. Refuses files >= 3.5MB to stay under
 * Gemini's inline payload limit (~4MB).
 */
export function loadImageAsInlineImage(path: string, cwd: string = process.cwd()): InlineImage {
  const target = isAbsolute(path) ? path : resolve(cwd, path);
  const ext = extname(target).toLowerCase();
  const mimeType = MIME_BY_EXT[ext];
  if (!mimeType) {
    throw new ConfigError(
      `Unsupported screenshot format: ${ext || '(no extension)'}. Use png, jpg, jpeg, webp, or gif.`,
      { code: 'SCREENSHOT_BAD_EXT' },
    );
  }

  let stats;
  try {
    stats = statSync(target);
  } catch (err) {
    throw new ConfigError(`Screenshot not found: ${target}`, {
      code: 'SCREENSHOT_NOT_FOUND',
      cause: err,
    });
  }
  if (stats.size > MAX_BYTES) {
    throw new ConfigError(
      `Screenshot ${target} is ${(stats.size / 1024 / 1024).toFixed(1)}MB. Compress to <3.5MB.`,
      { code: 'SCREENSHOT_TOO_LARGE' },
    );
  }

  const buffer = readFileSync(target);
  return { mimeType, data: buffer.toString('base64') };
}
