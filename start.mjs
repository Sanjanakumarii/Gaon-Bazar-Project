import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
let node = process.execPath;
if (Number(process.versions.node.split('.')[0]) < 24) {
  const bundled = path.join(os.homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'bin', process.platform === 'win32' ? 'node.exe' : 'node');
  if (!existsSync(bundled)) {
    console.error('Please install Node.js 24 LTS or newer, then run node start.mjs again.');
    process.exit(1);
  }
  node = bundled;
}
const runtime = path.join(root, '.runtime');
if (!existsSync(path.join(runtime, 'standalone', 'server.mjs'))) {
  mkdirSync(runtime, { recursive: true });
  const extracted = spawnSync('tar', ['-xf', path.join(root, 'gaon-bazaar-project.zip'), '-C', runtime], { stdio: 'inherit' });
  if (extracted.status !== 0) {
    console.error('Extract gaon-bazaar-project.zip manually, then run node standalone/server.mjs inside the extracted folder.');
    process.exit(1);
  }
}
const child = spawn(node, ['standalone/server.mjs'], { cwd: runtime, stdio: 'inherit', env: process.env });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 0; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
