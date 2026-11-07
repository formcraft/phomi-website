// Browser test of the built site + PHP backend (SQLite, mock payments).
// Run after "npm run build":  node scripts/test-site.mjs [screenshot-folder]
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync, rmSync, existsSync, readdirSync, cpSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = resolve('.');
const SHOTS = process.argv[2] ? resolve(process.argv[2]) : null;
const PORT = 8098;
const BASE = `http://127.0.0.1:${PORT}`;
const tmp = mkdtempSync(join(tmpdir(), 'phomi-site-'));
const web = join(tmp, 'public_html');
mkdirSync(web);
for (const f of readdirSync(join(ROOT, 'dist'))) if (f !== 'api') cpSync(join(ROOT, 'dist', f), join(web, f), { recursive: true });
symlinkSync(join(ROOT, 'api'), join(web, 'api'), 'junction');
const cfg = join(tmp, 'config.php');
writeFileSync(cfg, `<?php return ['debug'=>true,'site_url'=>'${BASE}','app_key'=>str_repeat('k',40),'install_token'=>'install-token-123',
'db'=>['dsn'=>'sqlite:${tmp}/site.db','user'=>null,'pass'=>null],'uploads_dir'=>'${web}/uploads','uploads_url'=>'/uploads',
'mail_log'=>'${tmp}/mail.log','mail_from'=>'church@phomi.test','payments'=>['provider'=>'mock','min'=>500,'max'=>5000000,'yo'=>[],'flutterwave'=>[]]];`);

const server = spawn('php', ['-S', `127.0.0.1:${PORT}`, '-t', web, join(ROOT, 'api', 'tests', 'router.php')], { env: { ...process.env, PHOMI_CONFIG: cfg }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const fails = [];
const check = (name, ok, info = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  -> ${info}`)); if (!ok) fails.push(name); };
const shot = async (page, name) => { if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: join(SHOTS, name + '.png'), fullPage: false }); } };

const browser = await chromium.launch();
try {
  // One-time setup through the real installer page
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

  await page.goto(`${BASE}/api/install.php?token=install-token-123`);
  await page.fill('input[name=name]', 'Pastor Test');
  await page.fill('input[name=email]', 'pastor@phomi.test');
  await page.fill('input[name=password]', 'correct horse 1');
  await page.click('button');
  check('installer creates the admin', await page.isVisible('text=All set'));

  // Admin: sign in
  await page.goto(`${BASE}/admin`);
  await page.fill('input[name=email]', 'pastor@phomi.test');
  await page.fill('input[name=password]', 'correct horse 1');
  await shot(page, 'admin-login');
  await page.click('button:has-text("Sign in")');
  await page.waitForSelector('h1:has-text("Overview")');
  check('admin sign-in shows the overview', true);
  await shot(page, 'admin-overview');

  // Add a sermon
  await page.click('nav >> text=Sermons');
  await page.click('button:has-text("Add")');
  await page.fill('label:has-text("Title") input', 'Faith that moves mountains');
  await page.fill('label:has-text("Preacher") input', 'Pastor Test');
  await page.fill('label:has-text("Scripture") input', 'Mark 11:22-24');
  await page.fill('label:has-text("Date preached") input', '2026-11-01');
  await page.fill('label:has-text("Summary") textarea', 'Have faith in God. Whatever you ask in prayer, believe.');
  await page.fill('label:has-text("YouTube") input', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await shot(page, 'admin-sermon-form');
  await page.click('button:has-text("Save")');
  await page.waitForSelector('text=Faith that moves mountains');
  check('sermon saved from the admin page', true);

  // Bulk photo upload
  const jpg = join(tmp, 'outreach.jpg');
  execFileSync('php', ['-r', `$i=imagecreatetruecolor(1600,1200);for($x=0;$x<1600;$x+=50)imagefilledrectangle($i,$x,0,$x+25,1200,imagecolorallocate($i,160,50+$x%150,7));imagejpeg($i,"${jpg}",90);`]);
  await page.click('nav >> text=Gallery');
  await page.selectOption('.adm-bulk select', 'Outreach');
  await page.fill('.adm-bulk input:not([type=file])', 'Kibuku outreach');
  await page.setInputFiles('.adm-bulk input[type=file]', [jpg]);
  await page.waitForSelector('text=1 photo added');
  await page.waitForSelector('.adm-photos li');
  check('photo uploaded from the admin page', (await page.locator('.adm-photos li').count()) === 1);
  await shot(page, 'admin-gallery');

  // Announcement and settings
  await page.click('nav >> text=Announcements');
  await page.click('button:has-text("Add")');
  await page.fill('label:has-text("Headline") input', 'Youth crusade this Saturday at 2pm');
  await page.click('button:has-text("Save")');
  await page.waitForSelector('text=Youth crusade this Saturday');
  // A TikTok video link
  await page.click('nav >> text=Videos');
  await page.click('button:has-text("Add")');
  await page.fill('label:has-text("Title") input', 'Choir at the crusade');
  await page.fill('label:has-text("TikTok") input', 'https://www.tiktok.com/@phomi/video/7301234567890123456');
  await page.selectOption('label:has-text("Category") select', 'Outreach');
  await page.click('button:has-text("Save")');
  await page.waitForSelector('.adm-list >> text=Choir at the crusade');
  check('TikTok video saved from the admin page', await page.isVisible('.adm-list >> text=TikTok'));

  // Delete something, then undo it from the history
  await page.click('nav >> text=Announcements');
  await page.waitForSelector('text=Youth crusade this Saturday');
  page.once('dialog', (d) => d.accept());
  await page.click('.adm-list li:has-text("Youth crusade") button[aria-label="Delete"]');
  await page.waitForSelector('text=Nothing here yet.');
  await page.click('nav >> text=History & undo');
  await page.waitForSelector('text=Deleted announcement');
  await shot(page, 'admin-history');
  page.once('dialog', (d) => d.accept());
  await page.click('.adm-list li:has-text("Deleted announcement") button:has-text("Undo")');
  await page.waitForSelector('text=Undone.');
  await page.click('nav >> text=Announcements');
  await page.waitForSelector('text=Youth crusade this Saturday');
  check('undo brings back a deleted announcement', true);

  await page.click('nav >> text=Settings');
  await page.fill('label:has-text("Prayer day") input', 'Wednesday');
  await page.click('.adm-head button:has-text("Save")');
  await page.waitForSelector('text=Saved.');
  check('settings saved', true);
  await shot(page, 'admin-settings');
  await page.click('nav >> text=Emailed updates');
  await page.waitForSelector('text=How to send an update');
  await shot(page, 'admin-inbox');

  // Public site shows the live content
  await page.goto(`${BASE}/sermons`);
  await page.waitForSelector('h2:has-text("Faith that moves mountains")');
  check('public Sermons page shows the new sermon', await page.isVisible('iframe[src*="youtube-nocookie.com/embed/dQw4w9WgXcQ"]'));
  await page.route(/tiktok\.com|ytimg\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
  check('TikTok video listed under Recent Moments', await page.isVisible('.clip:has-text("Choir at the crusade") >> .site:has-text("TikTok")'));
  await page.click('.clip:has-text("Choir at the crusade")');
  await page.waitForSelector('.lb iframe[src*="tiktok.com/player/v1/7301234567890123456"]');
  check('TikTok video plays in the viewer', true);
  await shot(page, 'site-tiktok');
  await page.keyboard.press('Escape');
  check('announcement bar on every page', await page.isVisible('.newsbar >> text=Youth crusade this Saturday'));
  await shot(page, 'site-sermons');
  await page.goto(`${BASE}/gallery`);
  await page.waitForSelector('img[alt="Kibuku outreach"]');
  check('public gallery shows the uploaded photo first', (await page.locator('.masonry img').first().getAttribute('alt')) === 'Kibuku outreach');
  await page.goto(`${BASE}/prayer`);
  check('prayer day from settings shows on the site', await page.isVisible('text=Wednesday · 6:30pm'));

  // Prayer form saves to the server
  await page.fill('#pr-name', 'Ruth');
  await page.fill('#pr-request', 'Please pray for my mother.');
  await page.click('button:has-text("Send prayer request")');
  await page.waitForSelector('text=Sent. Thank you');
  check('prayer request sent to the office', true);

  // Bible: open a reference, pick a verse, send it to a number, and sign up for the verse emails
  await page.goto(`${BASE}/bible?ref=John+3:16`);
  await page.waitForSelector('#v16.on');
  check('Bible opens John 3:16 from a link', await page.isVisible('.chapter h2:has-text("John 3")'));
  check('Verse of the Day shows on the Bible page', (await page.locator('.verse-card blockquote').count()) === 2);
  await page.click('#v17');
  await page.waitForSelector('.verse-bar >> text=John 3:17');
  await page.click('.verse-bar >> text=Send to a number');
  await page.fill('#bar-send-num', '0772 123456');
  const sms = await page.getAttribute('.verse-bar a:has-text("SMS")', 'href');
  const wa = await page.getAttribute('.verse-bar a:has-text("WhatsApp"):not(.btn-gold)', 'href');
  check('send-to-number fills the SMS link', sms?.startsWith('sms:+256772123456?&body=') && sms.includes('John%203%3A17'), sms);
  check('send-to-number fills the WhatsApp link', wa?.startsWith('https://wa.me/256772123456?text='), wa);
  await page.click('.verse-bar >> text=Close');
  await page.fill('#bible-q', 'living water');
  await page.press('#bible-q', 'Enter');
  await page.waitForSelector('.bible-results li:has-text("John 4:10")');
  check('word search finds John 4:10', true);
  await page.fill('#bible-subscribe-name', 'Ruth');
  await page.fill('#bible-subscribe-email', 'ruth@phomi.test');
  await page.click('#bible-subscribe button:has-text("Sign up")');
  await page.waitForSelector('#bible-subscribe .ok');
  check('verse email sign-up asks to confirm', /email/i.test(await page.textContent('#bible-subscribe .ok')));
  await page.goto(`${BASE}/admin`);
  await page.click('nav >> text=Daily verses');
  await page.waitForSelector('.adm-verse');
  check('admin Daily verses page lists the coming verses', (await page.locator('.adm-list li').count()) >= 35);
  await shot(page, 'admin-verses');
  await page.click('nav >> text=Email list');
  await page.waitForSelector('text=ruth@phomi.test');
  check('new sign-up waits in the admin email list', true);

  // Phone: giving with the PIN prompt
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p2 = await phone.newPage();
  p2.on('pageerror', (e) => errors.push(e.message));
  await p2.goto(`${BASE}/give`);
  await p2.waitForSelector('#give-phone');
  check('give page asks for the Mobile Money number', true);
  await p2.click('button.opt:has-text("20,000")');
  await p2.fill('#give-phone', '0752 345678');
  check('typing an Airtel number picks Airtel', (await p2.getAttribute('button.opt:has-text("Airtel Money")', 'aria-pressed')) === 'true');
  await p2.fill('#give-phone', '0772 345678');
  check('typing an MTN number picks MTN', (await p2.getAttribute('button.opt:has-text("MTN MoMo")', 'aria-pressed')) === 'true');
  await p2.locator('.givebtn').scrollIntoViewIfNeeded();
  await shot(p2, 'phone-give-form');
  await p2.click('.givebtn');
  await p2.waitForSelector('text=Check your phone');
  await shot(p2, 'phone-give-waiting');
  await p2.waitForSelector('text=Your gift has been received', { timeout: 20000 });
  check('gift confirmed on the page', await p2.isVisible('text=UGX 20,000 for Tithe & Offering'));
  await shot(p2, 'phone-give-done');

  // No sideways scrolling on a phone, and the admin works on a phone
  for (const path of ['/', '/sermons', '/gallery', '/events', '/bible', '/give', '/prayer', '/contact', '/admin']) {
    await p2.goto(BASE + path);
    await p2.waitForTimeout(400);
    const over = await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`no sideways scroll on ${path} (phone)`, over <= 1, over);
  }
  await p2.fill('input[name=email]', 'pastor@phomi.test');
  await p2.fill('input[name=password]', 'correct horse 1');
  await p2.click('button:has-text("Sign in")');
  await p2.waitForSelector('h1:has-text("Overview")');
  await shot(p2, 'phone-admin-overview');
  await p2.click('.adm-menu');
  await shot(p2, 'phone-admin-menu');
  await p2.click('nav >> text=Giving');
  await p2.waitForSelector('text=UGX 20,000');
  check('gift shows in the admin giving report', true);
  await shot(p2, 'phone-admin-giving');

  // Site still works when the server is missing (built-in content)
  const off = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const p3 = await off.newPage();
  await p3.route('**/api/**', (r) => r.fulfill({ status: 404, body: 'Not found', contentType: 'text/html' }));
  await p3.goto(`${BASE}/give`);
  await p3.waitForSelector('text=Giving from a computer?');
  check('without the server, giving falls back to the dial code', !(await p3.isVisible('#give-phone')));
  await p3.goto(`${BASE}/gallery`);
  check('without the server, the built-in gallery shows', (await p3.locator('.masonry img').count()) > 20);

  check('no script errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
  server.kill();
  rmSync(tmp, { recursive: true, force: true });
}
console.log(fails.length ? `\n${fails.length} failed` : '\nAll site tests passed');
process.exit(fails.length ? 1 : 0);
