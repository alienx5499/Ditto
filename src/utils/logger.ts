import { mkdirSync, createWriteStream } from 'node:fs';
import { resolve } from 'node:path';
import pino, { type Logger as PinoLogger, type DestinationStream } from 'pino';

let cachedLogger: PinoLogger | undefined;
let cachedSessionPath: string | undefined;

function buildLogger(): { logger: PinoLogger; sessionPath: string } {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = resolve(process.cwd(), '.ditto');
  mkdirSync(dir, { recursive: true });
  const sessionPath = resolve(dir, `session-${ts}.log`);

  const fileStream: DestinationStream = createWriteStream(sessionPath, { flags: 'a' });

  const level = process.env['DITTO_LOG_LEVEL'] ?? 'info';
  const logger = pino(
    {
      level,
      base: null,
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    fileStream,
  );

  return { logger, sessionPath };
}

/**
 * Process-wide logger. ndjson session file under `.ditto/`.
 * Terminal output is owned by `step-renderer` for legibility.
 */
export function getLogger(): PinoLogger {
  if (!cachedLogger) {
    const built = buildLogger();
    cachedLogger = built.logger;
    cachedSessionPath = built.sessionPath;
  }
  return cachedLogger;
}

export function getSessionLogPath(): string {
  if (!cachedSessionPath) {
    getLogger();
  }
  return cachedSessionPath as string;
}
