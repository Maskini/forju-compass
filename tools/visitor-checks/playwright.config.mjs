import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const root = process.env.COMPASS_PROJECT_DIR || fileURLToPath(new URL('../../', import.meta.url));
const baseURL = 'http://127.0.0.1:4196';
if (!process.env.COMPASS_TEST_QUOTA) throw Error('Run npm test so the app gets an isolated test quota.');

const engine = process.env.COMPASS_TEST_BROWSER || 'chrome';
if (!['chrome','webkit','firefox'].includes(engine)) throw Error('Use chrome, webkit or firefox.');
const suffix = engine === 'chrome' ? '' : '-'+engine;

export default defineConfig({
  testMatch: 'visitors.spec.mjs',
  workers: 1,
  retries: 0,
  outputDir: 'results'+suffix,
  reporter: [['list'], ['html', { outputFolder: 'report'+suffix, open: 'never' }]],
  use: {
    baseURL, serviceWorkers: 'block',
    ...(engine === 'webkit'
      ? {...devices['iPhone 13'], browserName: 'webkit'}
      : engine === 'firefox' ? {browserName:'firefox'} : {channel:'chrome'}),
  },
  webServer: {
    cwd: root,
    command: 'node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 4196',
    url: baseURL + '/embed?lang=de',
    reuseExistingServer: false,
    env: {
      COMPASS_LOCAL_ONLY: 'true',
      COMPASS_QUOTA_DB: process.env.COMPASS_TEST_QUOTA,
      COMPASS_CLIENT_IP_HEADER: '',
      NEXT_TELEMETRY_DISABLED: '1',
      RESEND_API_KEY: '',
      OPENAI_API_KEY: '',
    },
  },
});
