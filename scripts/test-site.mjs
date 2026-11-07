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

// Every piece of site text has Luganda, with the same {blanks} as the English
{
  const { TEXT } = await import('../src/text.js');
  const noLg = Object.keys(TEXT).filter((k) => !String(TEXT[k][1] || '').trim());
  const blanks = (x) => (String(x).match(/\{\w+\}/g) || []).sort().join();
  const badBlanks = Object.keys(TEXT).filter((k) => TEXT[k][1] && blanks(TEXT[k][0]) !== blanks(TEXT[k][1]));
  check(`all ${Object.keys(TEXT).length} pieces of site text have Luganda`, !noLg.length, noLg.slice(0, 10));
  check('Luganda text keeps the same {blanks} as English', !badBlanks.length, badBlanks.slice(0, 10));
}

// A pretend microphone and camera, so recording on the Prayer page can be tested
const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
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

  // Admin: sign in, reached from the link at the bottom of every page
  await page.goto(`${BASE}/about`);
  await page.click('footer a:has-text("Church admin sign-in")');
  await page.waitForSelector('input[name=email]');
  check('footer link opens the admin sign-in', new URL(page.url()).pathname === '/admin');
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
  // Wait for the page's own code to load (it loads separately) before looking.
  check('prayer day from settings shows on the site', await page.waitForSelector('text=Wednesday · 6:30pm', { timeout: 10000 }).then(() => true, () => false));

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

  // Admin → Site text: new wording in both languages with a colour, then back to the built-in text
  await page.click('nav >> text=Site text');
  await page.waitForSelector('h1:has-text("Site text")');
  await page.fill('input[type=search]', 'Shaped by');
  const row = page.locator('#st-home\\.heroTitle');
  await row.waitFor();
  await row.locator('textarea').nth(0).fill('Made new in the Potter\'s hand');
  await row.locator('textarea').nth(1).fill('Tufuulibwa abaggya mu mukono gw’Omubumbi');
  await row.locator('input[type=color]').fill('#1f6f3a');
  await row.locator('button:has-text("Save")').click();
  await row.locator('text=Saved.').waitFor();
  check('admin Site text saves English and Luganda wording', true);
  await shot(page, 'admin-site-text');
  await page.click('nav >> text=Social links');
  await page.fill('label:has-text("Instagram") input', 'https://www.instagram.com/phomi.test');
  await page.click('.adm-head button:has-text("Save")');
  await page.waitForSelector('text=Saved.');
  check('admin Social links saved', true);

  await page.goto(`${BASE}/`);
  await page.waitForSelector('h1:has-text("Made new in the Potter")');
  const colour = await page.evaluate(() => getComputedStyle(document.querySelector('[data-k="home.heroTitle"]')).color);
  check('home page shows the new wording in its colour', colour === 'rgb(31, 111, 58)', colour);
  const insta = page.locator('footer a[aria-label=Instagram]');
  check('new social link opens in a new tab', (await insta.getAttribute('href')) === 'https://www.instagram.com/phomi.test' && (await insta.getAttribute('target')) === '_blank');
  const offsite = await page.evaluate(() => [...document.querySelectorAll('a[href^="http"]')].filter((a) => new URL(a.href).host !== location.host && a.target !== '_blank').map((a) => a.href));
  check('every link to another website opens in a new tab', !offsite.length, offsite);

  // The language button: the whole site and the Bible in Luganda, remembered on the next visit
  await page.click('nav.main .langbtn');
  await page.waitForSelector('h1:has-text("Tufuulibwa abaggya")');
  check('language button switches the site to Luganda', (await page.getAttribute('html', 'lang')) === 'lg' && await page.isVisible('nav.main >> text=Laba & Soma') && await page.isVisible('nav.main >> text=Obujulirwa'));
  for (const w of [960, 1000, 1080, 1280, 1440]) {
    await page.setViewportSize({ width: w, height: 800 });
    const navH = await page.evaluate(() => document.querySelector('nav.main .in').getBoundingClientRect().height);
    check(`menu bar stays on one line in Luganda at ${w}px`, navH < 60, navH);
  }
  await page.goto(`${BASE}/bible`);
  await page.waitForSelector('.chapter h2');
  check('language choice is remembered on the next page', (await page.getAttribute('html', 'lang')) === 'lg');
  check('Luganda readers get the Luganda Bible', /Bayibuli Entukuvu/.test(await page.textContent('.chapter header')), await page.textContent('.chapter header'));
  check('Luganda chapters show the Biblica credit', /Biblica/.test(await page.textContent('.chapter .credit')));
  await page.fill('#bible-q', 'Yokaana 3:16');
  await page.press('#bible-q', 'Enter');
  await page.waitForSelector('.chapter h2:has-text("Yokaana 3")');
  check('a Luganda reference (Yokaana 3:16) opens the verse', await page.isVisible('#v16.on'));
  await shot(page, 'site-bible-luganda');
  await page.fill('#bible-subscribe-name', 'Nakato');
  await page.fill('#bible-subscribe-email', 'nakato@phomi.test');
  await page.click('#bible-subscribe button:has-text("Wewandiise")');
  await page.waitForSelector('#bible-subscribe .ok');
  check('Luganda sign-up is answered in Luganda', /Kumpi kuggwa/.test(await page.textContent('#bible-subscribe .ok')));
  await page.click('nav.main .langbtn');
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  check('language button switches back to English', await page.isVisible('nav.main >> text=Watch & Read'));
  await page.goto(`${BASE}/?lang=lg`);
  await page.waitForFunction(() => document.documentElement.lang === 'lg');
  check('a ?lang=lg link opens the site in Luganda', true);
  await page.goto(`${BASE}/?lang=en`);
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  await page.goto(`${BASE}/admin#text`);
  await page.fill('input[type=search]', 'Shaped by');
  await page.locator('#st-home\\.heroTitle button:has-text("Use the built-in wording")').click();
  await page.waitForSelector('text=Back to the built-in wording.');
  check('admin can put back the built-in wording', true);

  // The menu: six items, drop-downs that open by hover, click or keyboard, and visitor journeys
  {
    const mp = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
    mp.on('pageerror', (e) => errors.push(e.message));
    await mp.goto(`${BASE}/`);
    const top = await mp.locator('nav.main .in > a.nl, nav.main .in > .dd').count();
    check('menu bar has six items', top === 6, top);
    await mp.hover('nav.main button:has-text("About")');
    await mp.click('.dd-menu >> text=Ministries');
    await mp.waitForURL('**/ministries');
    check('About drop-down opens on hover and goes to Ministries', true);
    check('drop-down marks its section as current', await mp.isVisible('nav.main button[data-active]:has-text("About")'));
    await mp.focus('nav.main button:has-text("Watch & Read")');
    await mp.keyboard.press('Enter');
    check('drop-down opens with the keyboard', (await mp.getAttribute('nav.main button:has-text("Watch & Read")', 'aria-expanded')) === 'true');
    await mp.keyboard.press('Escape');
    check('Escape closes the drop-down', (await mp.getAttribute('nav.main button:has-text("Watch & Read")', 'aria-expanded')) === 'false');
    check('each page ends with its next steps', (await mp.locator('.next-steps .step').count()) === 3);
    await mp.goto(`${BASE}/`);
    check('home page asks how we can help, with six paths', (await mp.locator('.help .step').count()) === 6);
    await mp.click('.help .step[data-step=visit]');
    await mp.waitForSelector('#visit h2');
    const wa = await mp.getAttribute('#visit a:has-text("Send on WhatsApp")', 'href');
    check('Plan your visit sends a ready-made WhatsApp message', /wa\.me\/\d+\?text=Hello/.test(wa), wa);
    await mp.waitForFunction(() => navigator.serviceWorker?.controller || navigator.serviceWorker?.getRegistration().then((r) => !!r), null, { timeout: 5000 }).catch(() => {});
    await mp.context().close();
  }

  // The saved app shell: after one visit, pages open with no signal at all (service workers need https or localhost)
  {
    const sc = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const sp = await sc.newPage();
    sp.on('pageerror', (e) => errors.push(e.message));
    const LOCAL = `http://localhost:${PORT}`;
    await sp.goto(`${LOCAL}/`);
    await sp.evaluate(() => navigator.serviceWorker.ready);
    await sp.waitForTimeout(2500);
    await sp.reload();
    check('service worker looks after the site', await sp.evaluate(() => !!navigator.serviceWorker.controller));
    await sc.setOffline(true);
    await sp.goto(`${LOCAL}/about`);
    await sp.waitForSelector('h1:has-text("About PHOMI")', { timeout: 8000 });
    check('pages open with no signal after the first visit', true);
    await sp.goto(`${LOCAL}/admin`).catch(() => {});
    check('the admin page is never served from the saved copy', !(await sp.isVisible('input[name=email]').catch(() => false)));
    await sc.close();
  }

  // Testimonies: written, recorded voice note and recorded video; hidden until the admin publishes them
  {
    const tc = await browser.newContext({ viewport: { width: 1280, height: 860 }, permissions: ['microphone', 'camera'] });
    const tp = await tc.newPage();
    tp.on('pageerror', (e) => errors.push(e.message));
    await tp.goto(`${BASE}/prayer`);
    await tp.click('a:has-text("Share your testimony")');
    await tp.waitForURL('**/testimonies#share-testimony');
    await tp.waitForSelector('.tst-empty');
    check('Prayer page leads to the Testimonies page, which invites the first testimony', true);
    const form = tp.locator('#share-testimony');
    await form.locator('button:has-text("Send testimony")').click();
    check('testimony form asks for words first', await form.isVisible('text=Please write your testimony.'));
    await form.locator('textarea[name=body]').fill('God healed my back after the crusade. Glory to God!');
    await form.locator('input[name=name]').fill('Grace Akello');
    await form.locator('input[name=place]').fill('Burweta');
    await form.locator('input[name=title]').fill('Healed after prayer');
    await form.locator('input[name=contact]').fill('0772 000111');
    await form.locator('button:has-text("Send testimony")').click();
    check('testimony needs permission to share', await form.isVisible('text=Please tick the box'));
    await form.locator('input[name=consent]').check();
    await form.locator('button:has-text("Send testimony")').click();
    await tp.waitForSelector('text=Thank you for sharing what God has done!');
    check('written testimony sent for approval', true);
    await tp.click('button:has-text("Share another")');
    await form.locator('.tst-mode:has-text("Voice note")').click();
    await form.locator('button:has-text("Start recording")').click();
    await tp.waitForSelector('.tst-recbar');
    await tp.waitForTimeout(2200);
    await form.locator('.tst-recbar button:has-text("Stop")').click();
    await tp.waitForSelector('.tst-rec audio');
    check('voice note recorded on the page, ready to play back', true);
    await form.locator('input[name=name]').fill('Moses K');
    await form.locator('input[type=file][accept="image/*"]').setInputFiles(join(ROOT, 'public', 'img', 'service-family.jpg'));
    await form.locator('input[name=consent]').check();
    await shot(tp, 'site-testimony-voice');
    await form.locator('button:has-text("Send testimony")').click();
    await tp.waitForSelector('text=Thank you for sharing what God has done!', { timeout: 20000 });
    check('recorded voice note sent', true);
    await tp.click('button:has-text("Share another")');
    await form.locator('.tst-mode:has-text("Video")').click();
    await form.locator('button:has-text("Start recording")').click();
    await tp.waitForSelector('.tst-recbar');
    check('camera preview shows while recording a video', await tp.isVisible('.tst-live'));
    await tp.waitForTimeout(2200);
    await form.locator('.tst-recbar button:has-text("Stop")').click();
    await tp.waitForSelector('.tst-rec video[controls]');
    await form.locator('input[name=name]').fill('Sarah N');
    await form.locator('input[name=consent]').check();
    await form.locator('button:has-text("Send testimony")').click();
    await tp.waitForSelector('text=Thank you for sharing what God has done!', { timeout: 20000 });
    check('recorded video sent', true);
    await tp.goto(`${BASE}/testimonies`);
    await tp.waitForSelector('.tst-empty');
    check('testimonies stay hidden until approved', (await tp.locator('.tst-card').count()) === 0);

    await page.goto(`${BASE}/admin`);
    await page.waitForSelector('a[href="#testimonies"] b:has-text("3")');
    check('admin overview counts testimonies waiting', true);
    await page.click('nav >> text=Testimonies');
    await page.waitForSelector('text=contact: 0772 000111');
    check('admin can listen to the voice note and watch the video', (await page.locator('.adm-tst audio').count()) === 1 && (await page.locator('.adm-tst video').count()) === 1);
    await shot(page, 'admin-testimonies');
    for (let i = 0; i < 3; i++) await page.locator('.adm-list li button:has-text("Publish")').first().click().then(() => page.waitForTimeout(400));
    await tp.goto(`${BASE}/`);
    await tp.click('nav.main >> text=Testimonies');
    await tp.waitForSelector('.tst-card');
    const kinds = await tp.locator('.tst-card').evaluateAll((els) => els.map((e) => e.dataset.kind).sort().join());
    check('approved testimonies show as text, voice and video', kinds === 'audio,text,video', kinds);
    check('each testimony has a floating picture or initials', (await tp.locator('.tst-card .tst-av').count()) === 3 && (await tp.locator('.tst-audio .tst-av img').count()) === 1);
    check('testifier phone number never shown', !(await tp.textContent('body')).includes('0772 000111'));
    await tp.locator('.tst-audio .tst-playbtn').click();
    await tp.waitForSelector('.tst-voice.on');
    check('voice note plays on the page', true);
    await tp.locator('.tst-audio .tst-playbtn').click();
    await tp.locator('#testimonies').scrollIntoViewIfNeeded();
    await shot(tp, 'site-testimonies');
    await tp.click('nav.main .langbtn');
    await tp.waitForSelector('h2:has-text("Obujulirwa")');
    check('testimonies section in Luganda', await tp.isVisible('.tst-mode:has-text("Eddoboozi")'));
    await tp.click('nav.main .langbtn');
    await tc.close();
  }

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
  for (const path of ['/', '/sermons', '/gallery', '/events', '/bible', '/give', '/testimonies', '/prayer', '/contact', '/admin']) {
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
  const builtIn = await p3.waitForFunction(() => document.querySelectorAll('.masonry img').length > 20, null, { timeout: 10000 }).then(() => true, () => false);
  check('without the server, the built-in gallery shows', builtIn, await p3.locator('.masonry img').count());

  check('no script errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
  server.kill();
  rmSync(tmp, { recursive: true, force: true });
}
console.log(fails.length ? `\n${fails.length} failed` : '\nAll site tests passed');
process.exit(fails.length ? 1 : 0);
