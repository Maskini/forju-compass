// A disposable, loopback-only Compass server for the read-only ForJu browser preview.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), 'compass-design-'));
const port = 4262;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
  cwd: root, stdio: ['ignore','pipe','inherit'],
  env: {...process.env, COMPASS_LOCAL_ONLY:'true', OPENAI_API_KEY:'', RESEND_API_KEY:'',
    COMPASS_QUOTA_DB:join(scratch,'quota.sqlite'), NEXT_TELEMETRY_DISABLED:'1'},
});
const stopped = once(server,'exit');
function stop() { if (server.exitCode === null) server.kill('SIGTERM'); }
process.on('exit', stop);
try {
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Local Compass did not start within 30 seconds.')),30000);
    server.stdout.on('data',chunk=>{
      process.stdout.write(chunk);
      if (chunk.toString().includes('Ready')) {clearTimeout(timeout); resolve();}
    });
    server.once('error',e=>{clearTimeout(timeout);reject(e)});
    server.once('exit',code=>{clearTimeout(timeout);reject(Error('Local Compass exited ('+code+'). Check that port '+port+' is free.'))});
  });
  process.env.COMPASS_DESIGN_ORIGIN='http://127.0.0.1:'+port;
  await import('./design-preview.mjs');
} finally {
  stop();
  await stopped;
  await rm(scratch, {recursive:true,force:true});
}
