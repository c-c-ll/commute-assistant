import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = dirname(__dirname);

const api = spawn('pnpm', ['tsx', 'watch', 'server/server.ts'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, FORCE_COLOR: '0' },
});

const vite = spawn('pnpm', ['vite', '--port', '5001'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, FORCE_COLOR: '0' },
});

process.on('SIGINT', () => { api.kill(); vite.kill(); process.exit(); });
process.on('SIGTERM', () => { api.kill(); vite.kill(); process.exit(); });