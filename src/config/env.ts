import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

import { ConfigError } from '../errors/index.js';
import { gcpCredentialsSchema, type GcpCredentials } from '../schemas/gcp-credentials.js';
import type { ResolvedConfig } from '../types/index.js';

const DEFAULT_LOCATION = 'global';
const DEFAULT_MODEL = 'gemini-3.1-pro';
const DEFAULT_FALLBACKS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
];
const DEFAULT_BUDGET_MS = 5 * 60 * 1000;

const PACKAGE_VERSION = readPackageVersion();

/**
 * Resolves runtime config: gcp credentials, location, model, budget.
 * Reads `gcp.json` from the project root (current working directory).
 */
export function loadConfig(): ResolvedConfig {
  const gcpPath = resolve(process.cwd(), 'gcp.json');
  if (!existsSync(gcpPath)) {
    throw new ConfigError(
      `gcp.json not found at ${gcpPath}. Place your Google Cloud service account key file there.`,
      { code: 'GCP_JSON_MISSING' },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(gcpPath, 'utf8'));
  } catch (error) {
    throw new ConfigError('gcp.json is not valid JSON', {
      code: 'GCP_JSON_INVALID_JSON',
      cause: error,
    });
  }

  const result = gcpCredentialsSchema.safeParse(parsed);
  if (!result.success) {
    throw new ConfigError(
      `gcp.json failed validation: ${result.error.issues.map((i) => i.message).join('; ')}`,
      { code: 'GCP_JSON_INVALID_SHAPE', cause: result.error },
    );
  }

  const credentials: GcpCredentials = result.data;
  const location = (process.env['GOOGLE_CLOUD_LOCATION'] || DEFAULT_LOCATION).trim();
  const primaryModel = (process.env['GEMINI_MODEL'] || DEFAULT_MODEL).trim();
  const fallbackModels = DEFAULT_FALLBACKS.filter((m) => m !== primaryModel);
  const budgetMs = parsePositiveInt(process.env['DITTO_BUDGET_MS'], DEFAULT_BUDGET_MS);

  return {
    projectId: credentials.project_id,
    clientEmail: credentials.client_email,
    privateKey: credentials.private_key,
    location,
    primaryModel,
    fallbackModels,
    budgetMs,
    version: PACKAGE_VERSION,
  };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function readPackageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkgPath = resolve(here, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}
