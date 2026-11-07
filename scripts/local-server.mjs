// Run the whole website on your own computer, before any hosting:
//   npm run local            → http://localhost:8080
//   npm run local -- --lan   → also open it from a phone on the same Wi-Fi
//   npm run local -- --fresh → start again with an empty database
// Uses SQLite instead of MySQL, a pretend payment provider and a pretend SMS provider.
// Emails and SMS are not really sent: open /__mail and /__sms to read them.
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const PORT = Number(opt('port', 8080));
const LAN = flag('lan');
const ROOT = resolve('.');
const HOME = join(ROOT, '.local');
const WEB = join(HOME, 'public_html');
const ADMIN = { email: 'admin@phomi.local', password: 'preview-password' };
const php = process.env.PHP || 'php';

const fail = (msg) => { console.error(`\n✖ ${msg}\n`); process.exit(1); };

// 1. PHP with the extensions the site needs
const v = spawnSync(php, ['-r', 'echo PHP_VERSION, "|", implode(",", get_loaded_extensions());'], { encoding: 'utf8' });
if (v.status !== 0) fail('PHP was not found. Install PHP 8.1 or newer (see docs/LOCAL-PREVIEW.md), or set PHP=/path/to/php.');
const [ver, extList] = v.stdout.split('|');
const exts = extList.toLowerCase().split(',');
const missing = ['pdo_sqlite', 'gd', 'mbstring', 'fileinfo', 'zlib', 'openssl'].filter((e) => !exts.includes(e));
if (Number(ver.split('.')[0]) < 8 || (ver.startsWith('8.0'))) fail(`PHP ${ver} is too old. Install PHP 8.1 or newer.`);
if (missing.length) fail(`PHP is missing: ${missing.join(', ')}. Turn them on in php.ini (see docs/LOCAL-PREVIEW.md).`);

// 2. Build the site
if (!flag('no-build') || !existsSync(join(ROOT, 'dist', 'index.html'))) {
  console.log('Building the website…');
  const b = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', '-s', 'build'], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (b.status !== 0) fail('The build failed. Run "npm install" first.');
}

// 3. A web folder laid out like Hostinger's public_html
// Remove the links to api/ and uploads first, so clearing the folder never touches the real files
for (const l of ['api', 'uploads']) { try { if (lstatSync(join(WEB, l)).isSymbolicLink()) unlinkSync(join(WEB, l)); } catch { /* not there yet */ } }
if (flag('fresh')) rmSync(HOME, { recursive: true, force: true });
mkdirSync(HOME, { recursive: true });
rmSync(WEB, { recursive: true, force: true });
mkdirSync(WEB, { recursive: true });
for (const f of readdirSync(join(ROOT, 'dist'))) if (f !== 'api') cpSync(join(ROOT, 'dist', f), join(WEB, f), { recursive: true });
symlinkSync(join(ROOT, 'api'), join(WEB, 'api'), 'junction'); // edits to api/ show at once
mkdirSync(join(HOME, 'uploads'), { recursive: true });
symlinkSync(join(HOME, 'uploads'), join(WEB, 'uploads'), 'junction'); // uploads survive a restart

const lanIp = Object.values(networkInterfaces()).flat().find((n) => n && n.family === 'IPv4' && !n.internal)?.address;
const host = LAN ? '0.0.0.0' : '127.0.0.1';
const site = LAN && lanIp ? `http://${lanIp}:${PORT}` : `http://localhost:${PORT}`;
const p = (x) => x.replace(/\\/g, '/');
const cfg = join(HOME, 'config.php');
writeFileSync(cfg, `<?php // Local preview only. Never upload this file.
return [
  'debug' => true,
  'site_url' => '${site}',
  'app_key' => '${'local-preview-key-'.padEnd(48, 'x')}',
  'install_token' => 'local-install',
  'cron_token' => 'local-cron',
  'db' => ['dsn' => 'sqlite:${p(join(HOME, 'site.db'))}', 'user' => null, 'pass' => null],
  'uploads_dir' => '${p(join(HOME, 'uploads'))}',
  'uploads_url' => '/uploads',
  'mail_log' => '${p(join(HOME, 'mail.log'))}',
  'mail_from' => 'church@phomi.local',
  'payments' => ['provider' => 'mock', 'min' => 500, 'max' => 5000000, 'yo' => [], 'flutterwave' => []],
  'sms' => ['provider' => 'mock', 'log' => '${p(join(HOME, 'sms.log'))}'],
];
`);
const env = { ...process.env, PHOMI_CONFIG: cfg, PHOMI_LOCAL: '1' };

// 4. Tables, the Bible text and a test admin
const seed = spawnSync(php, [join(ROOT, 'scripts', 'local-seed.php'), ADMIN.email, ADMIN.password], { env, encoding: 'utf8' });
if (seed.status !== 0) fail('Setting up the local database failed:\n' + seed.stdout + seed.stderr);

// 5. The web server, and the 5-minute job every minute
const server = spawn(php, ['-S', `${host}:${PORT}`, '-t', WEB, join(ROOT, 'api', 'tests', 'router.php')], { env, stdio: ['ignore', 'ignore', 'pipe'] });
server.stderr.on('data', (d) => { const s = String(d); if (/Fatal|Warning|Parse error|Failed to listen/i.test(s)) process.stderr.write(s); });
server.on('exit', (code) => { if (code) fail(`The server stopped (port ${PORT} may be in use; try --port 8090).`); });
const tick = setInterval(() => spawn(php, [join(ROOT, 'api', 'cron', 'inbox.php')], { env, stdio: 'ignore' }), 60_000);

const stop = () => { clearInterval(tick); server.kill(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

setTimeout(() => {
  console.log(`
  Potter's House website is running on your computer.

  Website      ${site}
  Bible        ${site}/bible
  Admin        ${site}/admin
               email ${ADMIN.email}   password ${ADMIN.password}
  Test emails  ${site}/__mail   (confirm links, alerts, verse emails)
  Test SMS     ${site}/__sms
${LAN ? (lanIp ? `\n  On your phone (same Wi-Fi): ${site}\n` : '\n  No Wi-Fi address found for --lan.\n') : '\n  To open it on your phone too, stop this (Ctrl+C) and run: npm run local -- --lan\n'}
  Giving uses a pretend provider: the gift is confirmed after a few seconds, no money moves.
  Your data stays in the .local folder. Start empty with: npm run local -- --fresh
  Press Ctrl+C to stop.
`);
}, 700);
