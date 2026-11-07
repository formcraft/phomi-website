// Offline phone check of every page, the admin included, plus the security basics.
// Nothing leaves your computer: requests to other websites (Google Fonts, YouTube…) are blocked,
// so this also proves the site still works when the visitor's internet is weak or those sites are down.
// Run after "npm run build":  node scripts/test-phone.mjs [screenshot-folder]
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const ROOT = resolve('.');
const SHOTS = process.argv[2] ? resolve(process.argv[2]) : null;
const PORT = 8097;
const BASE = `http://127.0.0.1:${PORT}`;
const tmp = mkdtempSync(join(tmpdir(), 'phomi-phone-'));
const web = join(tmp, 'public_html');
mkdirSync(web);
for (const f of readdirSync(join(ROOT, 'dist'))) if (f !== 'api') cpSync(join(ROOT, 'dist', f), join(web, f), { recursive: true });
symlinkSync(join(ROOT, 'api'), join(web, 'api'), 'junction');
const cfg = join(tmp, 'config.php');
writeFileSync(cfg, `<?php return ['debug'=>false,'site_url'=>'${BASE}','app_key'=>str_repeat('k',40),'install_token'=>'install-token-123','cron_token'=>'cron-token-123',
'db'=>['dsn'=>'sqlite:${tmp}/site.db','user'=>null,'pass'=>null],'uploads_dir'=>'${web}/uploads','uploads_url'=>'/uploads',
'mail_log'=>'${tmp}/mail.log','mail_from'=>'church@phomi.test','payments'=>['provider'=>'mock','min'=>500,'max'=>5000000,'yo'=>[],'flutterwave'=>[]],
'sms'=>['provider'=>'mock','log'=>'${tmp}/sms.log']];`);
const env = { ...process.env, PHOMI_CONFIG: cfg };
const seed = spawnSync('php', [join(ROOT, 'scripts', 'local-seed.php'), 'admin@phomi.test', 'correct horse 1'], { env, encoding: 'utf8' });
if (seed.status !== 0) { console.error(seed.stdout + seed.stderr); process.exit(1); }
const server = spawn('php', ['-S', `127.0.0.1:${PORT}`, '-t', web, join(ROOT, 'api', 'tests', 'router.php')], { env, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const fails = [];
const check = (name, ok, info = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  -> ${typeof info === 'string' ? info : JSON.stringify(info)}`)); if (!ok) fails.push(name); };
const shot = async (page, name) => { if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: join(SHOTS, name + '.png'), fullPage: true }); } };

const PAGES = ['/', '/about', '/ministries', '/sermons', '/bible', '/events', '/gallery', '/testimonies', '/prayer', '/give', '/contact', '/no-such-page'];
const ADMIN = ['dashboard', 'inbox', 'sermons', 'videos', 'photos', 'events', 'announcements', 'testimonies', 'verses', 'letters', 'subscribers', 'sms_contacts', 'gifts', 'messages', 'senders', 'social', 'text', 'history', 'settings', 'account'];
const PHONES = [
  ['small Android 320px', { viewport: { width: 320, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
  ['Android 360px', { viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
  ['iPhone 13', devices['iPhone 13']],
  ['tablet 768px', { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
];

// What a page looks like to a phone user, measured in the browser
const audit = () => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const out = { overflow: document.documentElement.scrollWidth - window.innerWidth, h1: document.querySelectorAll('h1').length, noAlt: [], smallInputs: [], smallTaps: [], tinyText: [], sameTab: [], lang: document.documentElement.lang,
    toggle: [...document.querySelectorAll('.langbtn')].filter(vis).map((b) => b.textContent.trim()) };
  // Links to other websites must open in a new tab, safely
  for (const a of document.querySelectorAll('a[href^="http"]')) {
    if (new URL(a.href).host !== location.host && (a.target !== '_blank' || !/noopener/.test(a.rel))) out.sameTab.push(a.href.slice(0, 60));
  }
  for (const img of document.querySelectorAll('img')) if (!img.hasAttribute('alt')) out.noAlt.push(img.src.split('/').pop());
  for (const el of document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([name=website]), select, textarea')) {
    if (vis(el) && parseFloat(getComputedStyle(el).fontSize) < 16) out.smallInputs.push(el.id || el.name || el.tagName);
  }
  for (const el of document.querySelectorAll('button, .btn, .adm-btn, select, input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([name=website])')) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 32 || r.width < 32) out.smallTaps.push(`${(el.textContent || el.getAttribute('aria-label') || el.name || el.tagName).trim().slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  for (const el of document.querySelectorAll('p, li, label, td, blockquote')) {
    if (vis(el) && el.textContent.trim() && parseFloat(getComputedStyle(el).fontSize) < 12) out.tinyText.push(el.textContent.trim().slice(0, 30));
  }
  return out;
};

const browser = await chromium.launch();
try {
  for (const [label, device] of PHONES) {
    const ctx = await browser.newContext(device);
    // Offline from the rest of the internet: only this computer answers
    let blocked = 0;
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => { blocked++; return r.abort(); });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_FAILED/.test(m.text())) errors.push(m.text()); });
    let bytes = 0;
    page.on('response', async (res) => { if (res.url().startsWith(BASE)) { const l = Number(res.headers()['content-length'] || 0); bytes += l || (await res.body().catch(() => Buffer.alloc(0))).length; } });

    for (const path of PAGES) {
      bytes = 0;
      const t = Date.now();
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      const ms = Date.now() - t;
      const a = await page.evaluate(audit);
      const name = `${path} on ${label}`;
      check(`${name}: fits the screen`, a.overflow <= 1, `${a.overflow}px too wide`);
      check(`${name}: has a page heading`, a.h1 >= 1, a.h1);
      check(`${name}: every picture has a description`, !a.noAlt.length, a.noAlt);
      check(`${name}: form fields are 16px+ (no zoom-in on iPhone)`, !a.smallInputs.length, a.smallInputs);
      check(`${name}: buttons are big enough to tap`, !a.smallTaps.length, a.smallTaps);
      check(`${name}: no tiny text`, !a.tinyText.length, a.tinyText);
      check(`${name}: links to other websites open in a new tab`, !a.sameTab.length, a.sameTab);
      check(`${name}: English / Luganda button on screen`, a.toggle.length === 1 && a.toggle[0] === 'Luganda', a.toggle);
      if (label === 'Android 360px') {
        check(`${name}: first load under 3 MB`, bytes < 3_000_000, `${(bytes / 1e6).toFixed(2)} MB`);
        console.log(`     ${path}: ${(bytes / 1e6).toFixed(2)} MB, ${ms} ms`);
      }
      await shot(page, `${label.replace(/\W+/g, '-')}${path.replace(/\W+/g, '-') || '-home'}`);
    }

    // The whole site in Luganda: press the language button, then every page again
    await page.goto(BASE + '/');
    await page.click('.langbtn >> visible=true');
    await page.waitForFunction(() => document.documentElement.lang === 'lg');
    for (const path of PAGES) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      const a = await page.evaluate(audit);
      const name = `${path} in Luganda on ${label}`;
      check(`${name}: shows Luganda`, a.lang === 'lg' && a.toggle[0] === 'English', { lang: a.lang, toggle: a.toggle });
      check(`${name}: fits the screen`, a.overflow <= 1, `${a.overflow}px too wide`);
      check(`${name}: buttons are big enough to tap`, !a.smallTaps.length, a.smallTaps);
      check(`${name}: every picture has a description`, !a.noAlt.length, a.noAlt);
      await shot(page, `${label.replace(/\W+/g, '-')}-lg${path.replace(/\W+/g, '-') || '-home'}`);
    }
    await page.click('.langbtn >> visible=true');
    await page.waitForFunction(() => document.documentElement.lang === 'en');
    check(`language choice goes back to English on ${label}`, true);

    // The phone menu opens and every link in it works
    await page.goto(BASE + '/');
    const menu = page.locator('.menu-btn').first();
    if (await menu.isVisible()) {
      await menu.click();
      await page.click('#mnav >> text=Bible');
      await page.waitForURL('**/bible');
      check(`phone menu goes to the Bible on ${label}`, true);
    }

    // Bible on the phone: open a chapter, tap a verse, the share bar fits
    await page.goto(`${BASE}/bible?ref=Psalm+23:1`);
    await page.waitForSelector('#v1.on');
    check(`back in English, the Bible is English again on ${label}`, /^Psalm 23/.test(await page.textContent('.chapter h2')), await page.textContent('.chapter h2'));
    // Let the page finish scrolling to the verse, then bring verse 4 into the middle like a reader would
    await page.waitForTimeout(600);
    await page.locator('#v4').evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await page.tap('#v4');
    await page.waitForSelector('.verse-bar >> text=Psalm 23:4');
    const bar = await page.evaluate(() => { const r = document.querySelector('.verse-bar').getBoundingClientRect(); return { w: r.width, h: r.height, vh: window.innerHeight }; });
    check(`verse share bar fits on ${label}`, bar.w <= (device.viewport?.width || 9999) + 1 && bar.h < bar.vh * 0.6, bar);

    // Testimonies on the phone: the mixed gallery (preview samples) fits, avatars stay on screen, the recorder buttons show
    await page.goto(`${BASE}/testimonies`);
    await page.waitForSelector('.tst-card');
    const tg = await page.evaluate(() => ({
      cards: document.querySelectorAll('.tst-card').length,
      kinds: [...new Set([...document.querySelectorAll('.tst-card')].map((c) => c.dataset.kind))].sort().join(),
      off: [...document.querySelectorAll('.tst-av, .tst-card')].filter((e) => { const r = e.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth + 1; }).length,
    }));
    check(`testimony gallery mixes text, voice and video on ${label}`, tg.cards >= 6 && tg.kinds === 'audio,text,video', tg);
    check(`testimony cards and avatars stay on screen on ${label}`, tg.off === 0, tg);
    await page.locator('#share-testimony .tst-mode').nth(2).tap();
    check(`video recorder offered on ${label}`, await page.isVisible('#share-testimony button:has-text("Start recording")'));

    // Admin on the phone: every section opens without errors and fits the screen
    if (label !== 'tablet 768px') {
      await page.goto(BASE + '/admin');
      await page.waitForSelector('input[name=email], h1:has-text("Overview")');
      if (await page.isVisible('input[name=email]')) {
        await page.fill('input[name=email]', 'admin@phomi.test');
        await page.fill('input[name=password]', 'correct horse 1');
        await page.click('button:has-text("Sign in")');
      }
      await page.waitForSelector('h1:has-text("Overview")', { timeout: 8000 }).catch(async () => { throw new Error('admin sign-in failed: ' + (await page.textContent('body')).slice(0, 300)); });
      for (const s of ADMIN) {
        await page.goto(`${BASE}/admin#${s}`);
        await page.waitForTimeout(250);
        await page.waitForLoadState('networkidle');
        const a = await page.evaluate(audit);
        check(`admin ${s} on ${label}: fits the screen`, a.overflow <= 1, `${a.overflow}px too wide`);
        check(`admin ${s} on ${label}: form fields are 16px+`, !a.smallInputs.length, a.smallInputs);
        await shot(page, `${label.replace(/\W+/g, '-')}-admin-${s}`);
      }
    }
    check(`loads nothing from other websites on ${label} (fonts are on this site)`, blocked === 0, `${blocked} outside requests`);
    check(`no script errors on ${label}`, !errors.length, errors.slice(0, 5));
    await ctx.close();
  }

  // ---- Found on Google ----
  {
    const seen = new Set();
    for (const path of PAGES.filter((p) => p !== '/no-such-page')) {
      const html = await (await fetch(BASE + path)).text();
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1] || '';
      const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] || '';
      const canon = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] || '';
      const ld = html.match(/<script type="application\/ld\+json">([^<]*)<\/script>/)?.[1];
      let church = null;
      try { church = JSON.parse(ld); } catch { /* checked below */ }
      check(`${path}: own title and description in the HTML (${title.length}/${desc.length} chars)`, title && desc && !seen.has(title) && title.length <= 70 && desc.length >= 70 && desc.length <= 170, { title, desc: desc.length });
      check(`${path}: one address for Google (canonical)`, canon.endsWith(path === '/' ? '/' : path) && canon.startsWith('https://'), canon);
      check(`${path}: church details for Google (schema.org)`, church?.['@type'] === 'Church' && church.address?.addressCountry === 'UG');
      check(`${path}: readable without JavaScript`, /<noscript><h1>/.test(html));
      seen.add(title);
    }
    const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
    check('sitemap lists every page', (sitemap.match(/<loc>/g) || []).length === PAGES.length - 1 && sitemap.includes('/bible</loc>'), sitemap.slice(0, 200));
    const robots = await (await fetch(`${BASE}/robots.txt`)).text();
    check('robots.txt points to the sitemap and hides the admin', /Sitemap: https:\/\/.+\/sitemap\.xml/.test(robots) && /Disallow: \/admin/.test(robots), robots);
    const hta = readFileSync(join(ROOT, 'public', '.htaccess'), 'utf8');
    check('old WordPress addresses redirect to the new pages', /\^\(about-us/.test(hta) && /\^\(prayer-requests\?/.test(hta) && /R=301/.test(hta));
    // Every page in the old WordPress sitemap (read 2026-11-08) must end on a real new page:
    // either a page of the new site, or a 301 rule in .htaccess that points to one.
    const OLD_WP = ['/', '/about-2/', '/contact-2/', '/donation-confirmation/', '/donation-confirmation-2/', '/donation-failed/',
      '/donation-failed-2/', '/donor-dashboard/', '/donor-dashboard-2/', '/events/', '/give/', '/ministries/', '/prayer-requests/', '/sermons/'];
    const rules = [...hta.matchAll(/^RewriteRule \^(\S+)\$ (\/\S*) \[L,R=301\]$/gm)].map((m) => [new RegExp(`^${m[1]}$`), m[2]]);
    const pages = new Set(PAGES.map((p) => p.split('?')[0]));
    const lost = OLD_WP.filter((old) => {
      const path = old.replace(/(.)\/$/, '$1'); // the trailing-slash rule runs first
      const to = pages.has(path) ? path : rules.find(([re]) => re.test(path.slice(1)))?.[1];
      return !to || !pages.has(to);
    });
    check('every old WordPress page lands on a new page', lost.length === 0, lost.join(', '));
  }

  // ---- Security basics ----
  const res = await fetch(`${BASE}/bible`);
  const h = (n) => res.headers.get(n) || '';
  check('pages send a Content Security Policy', /script-src 'self'/.test(h('content-security-policy')) && /object-src 'none'/.test(h('content-security-policy')));
  check('pages refuse to be framed by other sites', h('x-frame-options') === 'SAMEORIGIN' && /frame-ancestors 'self'/.test(h('content-security-policy')));
  check('pages send nosniff, referrer and permissions headers', h('x-content-type-options') === 'nosniff' && !!h('referrer-policy') && /camera=\(self\)/.test(h('permissions-policy')) && /geolocation=\(\)/.test(h('permissions-policy')));
  const hta = readFileSync(join(ROOT, 'public', '.htaccess'), 'utf8');
  const apiHta = readFileSync(join(ROOT, 'api', '.htaccess'), 'utf8');
  check('Hostinger forces HTTPS and HSTS', /RewriteCond %\{HTTPS\} off/.test(hta) && /Strict-Transport-Security/.test(hta));
  check('Hostinger never serves the code, config, data or tests', /\(lib\|cron\|tests\|vendor\|data\)/.test(apiHta) && /config\\\.php/.test(apiHta));
  check('hidden files like .git and .env are never served', /RedirectMatch 404 \/\\\.\(\?!well-known\)/.test(hta));
  for (const p of ['/api/admin/stats', '/api/admin/subscribers.csv', '/api/admin/sms_contacts.csv', '/api/admin/lists', '/api/admin/r/subscribers']) {
    const r = await fetch(BASE + p, { headers: { 'X-PHOMI': '1' } });
    const body = await r.text();
    check(`${p} needs an admin sign-in`, r.status === 401 && !body.includes('@'), r.status);
  }
  {
    const r = await fetch(`${BASE}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@phomi.test', password: 'correct horse 1' }) });
    check('admin sign-in refuses requests from other websites (no X-PHOMI header)', r.status === 403, r.status);
  }
  {
    let last = 0;
    for (let i = 0; i < 10; i++) {
      const r = await fetch(`${BASE}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PHOMI': '1' }, body: JSON.stringify({ email: 'admin@phomi.test', password: 'wrong password ' + i }) });
      last = r.status;
    }
    check('password guessing is slowed down after a few tries', last === 429, last);
  }
  {
    const r = await fetch(`${BASE}/api/install.php`);
    const t = await r.text();
    check('the installer does nothing without its token', !/Create the first admin/.test(t) && r.status >= 400, r.status);
  }
  {
    const r = await fetch(`${BASE}/api/cron/inbox?token=wrong`);
    check('the cron link needs its token', r.status === 403, r.status);
  }
  {
    const r = await fetch(`${BASE}/api/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'x@example.com', daily: true, website: 'http://spam' }) });
    const mail = (() => { try { return readFileSync(join(tmp, 'mail.log'), 'utf8'); } catch { return ''; } })();
    check('bots that fill the hidden field get nothing sent', r.status === 200 && !mail.includes('To: x@example.com'));
  }
  {
    let last = 0;
    for (let i = 0; i < 8; i++) {
      const r = await fetch(`${BASE}/api/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `flood${i}@example.com`, daily: true }) });
      last = r.status;
    }
    check('sign-up flooding is limited', last === 429, last);
  }
  {
    const r = await fetch(`${BASE}/api/verse/image?d=1900-01-01`);
    check('verse pictures only for nearby dates (no disk filling)', r.status >= 400, r.status);
  }
  {
    const r = await fetch(`${BASE}/api/bible/search?q=${encodeURIComponent("' OR 1=1 --")}&tr=kjv`);
    const j = await r.json().catch(() => ({}));
    check('Bible search is safe from SQL tricks', r.status < 500 && !(j.total > 1000), { status: r.status, total: j.total });
  }
  {
    const r = await fetch(`${BASE}/api/health`);
    const t = await r.text();
    check('the health page shows no secrets', !/app_key|password|install-token|kkkkkkkk/i.test(t), t.slice(0, 200));
  }
} finally {
  await browser.close();
  server.kill();
  rmSync(tmp, { recursive: true, force: true });
}

if (fails.length) {
  console.log(`\n${fails.length} check${fails.length === 1 ? '' : 's'} failed`);
  process.exit(1);
}
console.log('\nAll phone and security checks passed');
