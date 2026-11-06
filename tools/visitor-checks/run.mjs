import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const temp = mkdtempSync(join(tmpdir(), 'compass-check-'));
try {
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
  const run = spawnSync(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, COMPASS_TEST_QUOTA: join(temp, 'quota.sqlite') },
  });
  if (run.error) throw run.error;
  process.exitCode = run.status ?? 1;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
