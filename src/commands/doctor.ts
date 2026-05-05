import { existsSync, accessSync, constants } from 'node:fs';
import { resolve } from 'node:path';

import { loadConfig } from '../config/env.js';
import { VertexGeminiProvider } from '../providers/vertex-gemini.js';
import { theme } from '../ui/theme.js';

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

/**
 * `ditto doctor`. Runs offline + a single online ping. Prints a checklist.
 * Exits non-zero if any required check fails.
 */
export async function runDoctor(): Promise<number> {
  const checks: CheckResult[] = [];

  const gcpPath = resolve(process.cwd(), 'gcp.json');
  checks.push({
    name: 'gcp.json present',
    ok: existsSync(gcpPath),
    detail: gcpPath,
  });

  let config;
  try {
    config = loadConfig();
    checks.push({ name: 'gcp.json valid', ok: true, detail: `project=${config.projectId}` });
  } catch (err) {
    checks.push({
      name: 'gcp.json valid',
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
    print(checks);
    return 1;
  }

  const outputDir = resolve(process.cwd(), 'output');
  let outputWritable = false;
  try {
    if (!existsSync(outputDir)) {
      checks.push({ name: 'output dir', ok: true, detail: 'will be created on first write' });
      outputWritable = true;
    } else {
      accessSync(outputDir, constants.W_OK);
      outputWritable = true;
      checks.push({ name: 'output dir writable', ok: true, detail: outputDir });
    }
  } catch {
    checks.push({ name: 'output dir writable', ok: false, detail: outputDir });
  }

  try {
    const provider = new VertexGeminiProvider(config);
    const result = await provider.generate([
      {
        role: 'user',
        parts: [{ text: 'Reply with a single word: ok' }],
      },
    ]);
    checks.push({
      name: 'Gemini reachable',
      ok: result.text.toLowerCase().includes('ok'),
      detail: `${result.modelUsed} · ${result.latencyMs}ms`,
    });
  } catch (err) {
    checks.push({
      name: 'Gemini reachable',
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  print(checks);
  const allOk = checks.every((c) => c.ok) && outputWritable;
  return allOk ? 0 : 1;
}

function print(checks: CheckResult[]): void {
  console.log('');
  for (const c of checks) {
    const mark = c.ok ? theme.success('✓') : theme.error('✗');
    console.log(`  ${mark} ${c.name}  ${theme.muted(c.detail)}`);
  }
  console.log('');
}
