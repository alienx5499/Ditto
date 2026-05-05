import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConfigError } from '../../src/errors/index.js';
import { loadConfig } from '../../src/config/env.js';

const ORIGINAL_CWD = process.cwd();

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'ditto-env-'));
  process.chdir(tempDir);
});

afterEach(() => {
  process.chdir(ORIGINAL_CWD);
  rmSync(tempDir, { recursive: true, force: true });
  delete process.env['GOOGLE_CLOUD_LOCATION'];
  delete process.env['GEMINI_MODEL'];
  delete process.env['DITTO_BUDGET_MS'];
});

describe('loadConfig', () => {
  it('throws ConfigError when gcp.json is missing', () => {
    expect(() => loadConfig()).toThrow(ConfigError);
  });

  it('throws ConfigError on invalid JSON', () => {
    writeFileSync(join(tempDir, 'gcp.json'), '{not-json');
    expect(() => loadConfig()).toThrow(ConfigError);
  });

  it('throws ConfigError when required fields are missing', () => {
    writeFileSync(join(tempDir, 'gcp.json'), JSON.stringify({ project_id: 'p' }));
    expect(() => loadConfig()).toThrow(ConfigError);
  });

  it('returns resolved config with defaults', () => {
    writeFileSync(
      join(tempDir, 'gcp.json'),
      JSON.stringify({
        project_id: 'my-project',
        client_email: 'svc@my-project.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
      }),
    );
    const cfg = loadConfig();
    expect(cfg.projectId).toBe('my-project');
    expect(cfg.location).toBe('global');
    expect(cfg.primaryModel).toBe('gemini-3.1-flash-lite-preview');
    expect(cfg.fallbackModels.length).toBeGreaterThan(0);
    expect(cfg.budgetMs).toBeGreaterThan(0);
  });

  it('honors environment overrides', () => {
    writeFileSync(
      join(tempDir, 'gcp.json'),
      JSON.stringify({
        project_id: 'p',
        client_email: 's@p.iam.gserviceaccount.com',
        private_key: 'k',
      }),
    );
    process.env['GOOGLE_CLOUD_LOCATION'] = 'us-central1';
    process.env['GEMINI_MODEL'] = 'gemini-2.5-flash';
    process.env['DITTO_BUDGET_MS'] = '60000';
    const cfg = loadConfig();
    expect(cfg.location).toBe('us-central1');
    expect(cfg.primaryModel).toBe('gemini-2.5-flash');
    expect(cfg.budgetMs).toBe(60_000);
  });
});
