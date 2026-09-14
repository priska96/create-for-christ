import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const webDir = await mkdtemp(join(tmpdir(), 'cfc-e2e-'));
function run(args, cwd = root, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      args,
      { cwd, stdio: 'inherit', env: { ...process.env, ...env } }
    );
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Test command exited with ${code}`))
    );
  });
}
try {
  await run(['run', 'build']);
  await run(
    [
      'exec',
      '--',
      'expo',
      'export',
      '--platform',
      'web',
      '--output-dir',
      webDir,
    ],
    join(root, 'apps/mobile'),
    { EXPO_PUBLIC_API_URL: 'http://localhost:3101' }
  );
  await run(
    [
      'run',
      'test:browser',
      '-w',
      '@create-for-christ/e2e',
      '--',
      ...process.argv.slice(2),
    ],
    root,
    { CFC_E2E_WEB_DIR: webDir }
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await rm(webDir, { recursive: true, force: true });
}
