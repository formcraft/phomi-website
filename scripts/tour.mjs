// Screenshot tour of the built site and admin with sample content.  node scripts/tour.mjs <out-folder>
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync, rmSync, readdirSync, cpSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const ROOT = resolve('.');
const OUT = resolve(process.argv[2]);
mkdirSync(OUT, { recursive: true });
const PORT = 8097, BASE = `http://127.0.0.1:${PORT}`;
const tmp = mkdtempSync(join(tmpdir(), 'phomi-tour-'));
const web = join(tmp, 'public_html');
mkdirSync(web);
for (const f of readdirSync(join(ROOT, 'dist'))) if (f !== 'api') cpSync(join(ROOT, 'dist', f), join(web, f), { recursive: true });
symlinkSync(join(ROOT, 'api'), join(web, 'api'));
const cfg = join(tmp, 'config.php');
writeFileSync(cfg, `<?php return ['debug'=>true,'site_url'=>'${BASE}','app_key'=>str_repeat('k',40),'install_token'=>'install-token-123',
'db'=>['dsn'=>'sqlite:${tmp}/site.db','user'=>null,'pass'=>null],'uploads_dir'=>'${web}/uploads','uploads_url'=>'/uploads',
'mail_log'=>'${tmp}/mail.log','mail_from'=>'church@phomi.test','payments'=>['provider'=>'mock','min'=>500,'max'=>5000000,'yo'=>[],'flutterwave'=>[]]];`);
const server = spawn('php', ['-S', `127.0.0.1:${PORT}`, '-t', web, join(ROOT, 'api', 'tests', 'router.php')], { env: { ...process.env, PHOMI_CONFIG: cfg }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch();
// The screenshot machine has no access to YouTube/TikTok, so their players are drawn as a stand-in picture.
const stub = (site) => `<html><body style="margin:0;background:#000 url(${BASE}/img/sunday-pulpit.jpg) center/cover;display:flex;align-items:center;justify-content:center;height:100vh;font:600 14px sans-serif;color:#fff">
<div style="text-align:center"><div style="width:68px;height:48px;border-radius:12px;background:${site === 'YouTube' ? '#f00' : '#000'};display:flex;align-items:center;justify-content:center;margin:auto">&#9654;</div><p style="background:rgba(0,0,0,.6);padding:4px 10px">${site} player</p></div></body></html>`;
const block = async (ctx) => {
  await ctx.route(/youtube-nocookie\.com\/embed/, (r) => r.fulfill({ contentType: 'text/html', body: stub('YouTube') }));
  await ctx.route(/tiktok\.com\/player/, (r) => r.fulfill({ contentType: 'text/html', body: stub('TikTok') }));
};
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await block(ctx);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/api/install.php?token=install-token-123`);
  await page.fill('input[name=name]', 'Pastor');
  await page.fill('input[name=email]', 'pastor@phomi.test');
  await page.fill('input[name=password]', 'correct horse 1');
  await page.click('button');
  await page.goto(`${BASE}/admin`);
  await page.fill('input[name=email]', 'pastor@phomi.test');
  await page.fill('input[name=password]', 'correct horse 1');
  await page.screenshot({ path: join(OUT, 'admin-login.jpg'), quality: 80 });
  await page.click('button:has-text("Sign in")');
  await page.waitForSelector('h1:has-text("Overview")');
  const post = (p, data) => page.request.post(`${BASE}/api/admin/${p}`, { data, headers: { 'X-PHOMI': '1' } });
  await post('r/sermons', { title: 'Faith that moves mountains', preacher: 'Pastor (sample)', preached_on: '2026-11-01', scripture: 'Mark 11:22-24', summary: 'Have faith in God. Whatever you ask in prayer, believe that you have received it. (Sample sermon for the preview.)', media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', cover: '/img/sunday-pulpit.jpg' });
  await post('r/sermons', { title: 'Walking by faith', preacher: 'Pastor (sample)', preached_on: '2026-10-25', scripture: '2 Corinthians 5:7', summary: 'We walk by faith, not by sight.', cover: '/img/service-hall.jpg' });
  await post('r/sermons', { title: 'Emailed sermon waiting for approval', preacher: 'Media team', preached_on: '2026-11-08', status: 'review' });
  await post('r/videos', { title: 'Choir at the crusade', link: 'https://www.tiktok.com/@phomi/video/7301234567890123456', category: 'Outreach', cover: '/img/crusade-field.jpg', posted_on: '2026-11-02' });
  await post('r/videos', { title: 'Sunday praise', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', category: 'Worship', cover: '/img/women-praise.jpg', posted_on: '2026-11-01' });
  for (const [f, c, k] of [['kids-visit', 'Kibuku outreach', 'Outreach'], ['celebration', 'Thanksgiving Sunday', 'Special service']]) await post('r/photos', { file: `/img/${f}.jpg`, caption: c, category: k });
  await post('r/events', { title: 'Youth crusade', kind: 'Crusade', starts_at: '2026-12-14T14:00', venue: 'Burweta field', details: 'An afternoon of worship and the Word for young people.', cover: '/img/crusade-field.jpg' });
  await post('r/events', { title: 'Christmas service', kind: 'Special service', starts_at: '2026-12-25T09:00', venue: 'PHOMI, Burweta' });
  await post('r/announcements', { title: 'Youth crusade this Saturday at 2pm on the Burweta field' });
  await post('r/testimonies', { name: 'Sarah (sample)', title: 'Healed after prayer', body: 'I came to the Wednesday prayer meeting sick and went home well. Thank you, Jesus.', status: 'live' });
  await post('r/senders', { email: 'media@phomi.test', name: 'Media team' });
  await post('settings', { times_prayer_day: 'Wednesday', inbox_address: 'updates@pottershouseoutreachministriesinternational.com', youtube: 'https://www.youtube.com/@phomi', tiktok: 'https://www.tiktok.com/@phomi' });
  await page.request.post(`${BASE}/api/prayer`, { data: { name: 'Ruth', contact: '0772 000000', topic: 'Healing', request: 'Please pray for my mother.' } });
  const g = await (await page.request.post(`${BASE}/api/give`, { data: { amount: '20000', phone: '0772 345678', network: 'MTN', fund: 'tithe', name: 'Grace' } })).json();
  await page.waitForTimeout(6500);
  await page.request.get(`${BASE}/api/give/${g.ref}`);
  await post('r/announcements', { title: 'Youth crusade this Saturday at 2pm on the Burweta field' });

  for (const s of ['dashboard', 'inbox', 'sermons', 'videos', 'photos', 'events', 'announcements', 'testimonies', 'gifts', 'messages', 'senders', 'history', 'settings', 'account']) {
    await page.goto(`${BASE}/admin#${s}`);
    await page.reload();
    await page.waitForTimeout(700);
    await page.screenshot({ path: join(OUT, `admin-${s}.jpg`), quality: 80, fullPage: true });
  }
  await page.goto(`${BASE}/admin#videos`);
  await page.click('button:has-text("Add")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, 'admin-videos-form.jpg'), quality: 80, fullPage: true });

  const pages = ['/', '/about', '/ministries', '/sermons', '/events', '/gallery', '/prayer', '/give', '/contact'];
  const name = (p) => (p === '/' ? 'home' : p.slice(1));
  for (const p of pages) {
    await page.goto(BASE + p);
    await page.waitForTimeout(1200);
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT, `site-${name(p)}.jpg`), quality: 72, fullPage: true });
  }
  const phone = await browser.newContext({ ...devices['iPhone 13'] });
  await block(phone);
  const pp = await phone.newPage();
  for (const p of pages) {
    await pp.goto(BASE + p);
    await pp.waitForTimeout(900);
    await pp.screenshot({ path: join(OUT, `phone-${name(p)}.jpg`), quality: 72 });
  }
  const pa = await phone.newPage();
  await pa.goto(`${BASE}/admin`);
  await pa.fill('input[name=email]', 'pastor@phomi.test');
  await pa.fill('input[name=password]', 'correct horse 1');
  await pa.click('button:has-text("Sign in")');
  await pa.waitForSelector('h1:has-text("Overview")');
  await pa.screenshot({ path: join(OUT, 'phone-admin.jpg'), quality: 72 });
} finally {
  await browser.close();
  server.kill();
  rmSync(tmp, { recursive: true, force: true });
}
