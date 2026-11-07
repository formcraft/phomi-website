"""End-to-end test of the PHOMI API on PHP's built-in server with SQLite.

Run from the repo root:  python3 api/tests/test_api.py
Needs: php 8.1+ (pdo_sqlite, gd, curl, mbstring, fileinfo). No MySQL, payment account or API key needed:
payments use the 'mock' provider and email is read from a fake mailbox.
"""
import http.cookiejar, json, os, shutil, subprocess, sys, tempfile, time, urllib.error, urllib.parse, urllib.request
from email.message import EmailMessage

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
API = os.path.join(ROOT, 'api')
PORT, IMAP_PORT = 8099, 14300
BASE = f'http://127.0.0.1:{PORT}'

tmp = tempfile.mkdtemp(prefix='phomi-test-')
web = os.path.join(tmp, 'public_html'); os.makedirs(web)
os.symlink(API, os.path.join(web, 'api'))
cfg_path = os.path.join(tmp, 'config.php')
mail_log = os.path.join(tmp, 'mail.log')
with open(cfg_path, 'w') as f:
    f.write(f"""<?php return [
  'debug' => true, 'site_url' => '{BASE}', 'app_key' => str_repeat('k', 40), 'install_token' => 'install-token-123',
  'cron_token' => 'cron-token-123', 'db' => ['dsn' => 'sqlite:{tmp}/test.db', 'user' => null, 'pass' => null],
  'uploads_dir' => '{web}/uploads', 'uploads_url' => '/uploads', 'mail_log' => '{mail_log}',
  'mail_from' => 'church@phomi.test', 'payments' => ['provider' => 'mock', 'min' => 500, 'max' => 5000000, 'yo' => [], 'flutterwave' => []],
];""")

env = dict(os.environ, PHOMI_CONFIG=cfg_path)
server = subprocess.Popen(['php', '-S', f'127.0.0.1:{PORT}', '-t', web, os.path.join(API, 'tests', 'router.php')],
                          env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
time.sleep(0.8)

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
failures = []


def call(method, path, data=None, form=None, files=None, admin=True, raw=False):
    headers = {'X-PHOMI': '1'} if admin else {}
    body = None
    if files:
        boundary = 'testboundary123'
        parts = []
        for name, (fname, content, ctype) in files.items():
            parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{fname}"\r\nContent-Type: {ctype}\r\n\r\n'.encode() + content + b'\r\n')
        body = b''.join(parts) + f'--{boundary}--\r\n'.encode()
        headers['Content-Type'] = f'multipart/form-data; boundary={boundary}'
    elif form is not None:
        body = urllib.parse.urlencode(form).encode(); headers['Content-Type'] = 'application/x-www-form-urlencoded'
    elif data is not None:
        body = json.dumps(data).encode(); headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(BASE + path, data=body, method=method, headers=headers)
    try:
        r = opener.open(req)
        code, text = r.status, r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        code, text = e.code, e.read().decode()
    if raw:
        return code, text
    try:
        return code, json.loads(text)
    except ValueError:
        return code, {'_raw': text[:400]}


def check(name, cond, info=''):
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else f'  -> {info}'))
    if not cond:
        failures.append(name)


def jpeg(w=1600, h=1200):
    out = os.path.join(tmp, f'p{w}.jpg')
    subprocess.run(['php', '-r', f'$i=imagecreatetruecolor({w},{h});for($x=0;$x<{w};$x+=40)imagefilledrectangle($i,$x,0,$x+20,{h},imagecolorallocate($i,($x*7)%255,120,60));imagejpeg($i,"{out}",90);'], check=True)
    return open(out, 'rb').read()


def email(subject, body, sender='pastor@phomi.test', attachments=()):
    m = EmailMessage()
    m['From'] = f'Pastor Test <{sender}>'; m['To'] = 'updates@phomi.test'; m['Subject'] = subject
    m['Message-ID'] = f'<{time.time_ns()}@phomi.test>'
    m.set_content(body)
    for fname, data, maintype, subtype in attachments:
        m.add_attachment(data, maintype=maintype, subtype=subtype, filename=fname)
    path = os.path.join(tmp, f'mail{time.time_ns()}.eml')
    open(path, 'wb').write(m.as_bytes())
    return path


try:
    # ---- Setup ----
    code, h = call('GET', '/api/health', admin=False)
    check('health answers', code == 200 and h['database'] is True and h['payments'] == 'mock', h)
    code, page = call('GET', '/api/install.php?token=wrong', admin=False, raw=True)
    check('install refuses a wrong token', 'not valid' in page, page[:200])
    code, page = call('POST', '/api/install.php', form={'token': 'install-token-123', 'name': 'Pastor Test', 'email': 'pastor@phomi.test', 'password': 'correct horse 1'}, admin=False, raw=True)
    check('install creates the first admin', 'All set' in page, page[:300])
    code, page = call('GET', '/api/install.php?token=install-token-123', admin=False, raw=True)
    check('install is safe to run again', 'already exists' in page, page[:300])

    # ---- Sign in ----
    code, r = call('GET', '/api/admin/me')
    check('admin needs sign-in', code == 401, r)
    code, r = call('POST', '/api/admin/login', {'email': 'pastor@phomi.test', 'password': 'nope'})
    check('wrong password refused', code == 401, r)
    code, r = call('POST', '/api/admin/login', {'email': 'pastor@phomi.test', 'password': 'correct horse 1'}, admin=False)
    check('login without site header refused', code == 403, r)
    code, r = call('POST', '/api/admin/login', {'email': 'PASTOR@phomi.test', 'password': 'correct horse 1'})
    check('login works', code == 200 and r['admin']['email'] == 'pastor@phomi.test', r)
    code, r = call('GET', '/api/admin/me', admin=False)
    check('admin calls need the site header', code == 403, r)
    code, r = call('GET', '/api/admin/schema')
    check('schema lists sections', 'sermons' in r['resources'] and 'photos' in r['resources'], r)

    # ---- Content editing ----
    code, r = call('POST', '/api/admin/r/sermons', {'title': ''})
    check('sermon needs a title', code == 422, r)
    code, r = call('POST', '/api/admin/r/sermons', {'title': 'Faith that moves mountains', 'preacher': 'Pastor Test', 'preached_on': '2026-11-01', 'scripture': 'Mark 11:22-24', 'media_url': 'https://youtube.com/watch?v=abc'})
    check('sermon created', code == 200 and r['item']['status'] == 'live', r)
    sid = r['item']['id']
    code, r = call('POST', f'/api/admin/r/sermons/{sid}', {'scripture': 'Mark 11:22'})
    check('sermon updated', r['item']['scripture'] == 'Mark 11:22' and r['item']['title'] == 'Faith that moves mountains', r)
    code, r = call('POST', '/api/admin/r/sermons', {'title': 'Bad link', 'media_url': 'javascript:alert(1)'})
    check('unsafe links refused', code == 422, r)

    code, up = call('POST', '/api/admin/upload', files={'file': ('Outreach Day.jpg', jpeg(), 'image/jpeg')})
    check('photo upload', code == 200 and up['kind'] == 'image' and up['url'].startswith('/uploads/'), up)
    code, img = call('GET', up['url'], admin=False, raw=True)
    check('uploaded photo is served', code == 200, code)
    code, r = call('POST', '/api/admin/upload', files={'file': ('evil.php', b'<?php echo 1;', 'image/jpeg')})
    check('script upload refused', code == 415, r)
    code, r = call('POST', '/api/admin/r/photos', {'file': up['url'], 'caption': 'Outreach day', 'category': 'Outreach'})
    check('photo added to gallery', code == 200, r)
    code, r = call('POST', '/api/admin/r/photos', {'file': 'https://evil.example/x.jpg"', 'caption': 'x'})
    code2, r2 = call('POST', '/api/admin/r/photos', {'file': '/etc/passwd'})
    check('photo must be an upload', code2 == 422, r2)
    code, r = call('POST', '/api/admin/r/events', {'title': 'Youth crusade', 'starts_at': '2030-12-14T14:00', 'venue': 'Burweta field'})
    check('event created', code == 200 and r['item']['starts_at'] == '2030-12-14 14:00:00', r)
    code, r = call('POST', '/api/admin/r/announcements', {'title': 'New hall chairs have arrived'})
    check('announcement created', code == 200, r)
    code, r = call('POST', '/api/admin/r/videos', {'title': 'No link'})
    check('video needs a link or a file', code == 422, r)
    code, r = call('POST', '/api/admin/r/videos', {'title': 'Choir on Sunday', 'link': 'https://www.tiktok.com/@phomi/video/7301234567890123456', 'category': 'Worship'})
    check('TikTok video added', code == 200 and r['item']['link'].endswith('/video/7301234567890123456'), r)

    code, r = call('POST', '/api/admin/settings', {'times_prayer_day': 'Wednesday', 'imap_user': 'updates@phomi.test', 'imap_pass': 'secret pass', 'imap_host': '127.0.0.1', 'imap_port': str(IMAP_PORT), 'bogus': 'x'})
    check('settings saved, password hidden', r['settings']['times_prayer_day'] == 'Wednesday' and r['settings']['imap_pass'] == '••••••••' and 'bogus' not in r['settings'], r)

    code, c = call('GET', '/api/content', admin=False)
    check('public content has the new items', len(c['sermons']) == 1 and len(c['photos']) == 1 and len(c['events']) == 1 and len(c['announcements']) == 1 and c['settings']['times_prayer_day'] == 'Wednesday', c)
    check('public content hides private settings', 'imap_pass' not in c['settings'] and 'imap_user' not in c['settings'], c['settings'])

    # ---- Giving ----
    code, r = call('POST', '/api/give', {'amount': '10000', 'phone': '0712 345678', 'network': 'MTN', 'fund': 'tithe'}, admin=False)
    check('bad network number refused', code == 422, r)
    code, r = call('POST', '/api/give', {'amount': '10000', 'phone': '0752 345678', 'network': 'MTN', 'fund': 'tithe'}, admin=False)
    check('Airtel number on MTN refused with a hint', code == 422 and 'Airtel' in r['error'], r)
    code, r = call('POST', '/api/give', {'amount': '100', 'phone': '0772 345678', 'network': 'MTN'}, admin=False)
    check('tiny gift refused', code == 422, r)
    code, r = call('POST', '/api/give', {'amount': '10,000', 'phone': '+256 772 345678', 'network': 'MTN', 'fund': 'outreach', 'name': 'Grace'}, admin=False)
    check('gift started (prompt sent)', code == 200 and r['status'] == 'pending' and r['ref'].startswith('PHOMI-'), r)
    ref = r['ref']
    time.sleep(7)
    code, r = call('GET', f'/api/give/{ref}', admin=False)
    check('gift confirmed', r['status'] == 'successful' and r['amount'] == 10000, r)
    code, r = call('POST', '/api/give', {'amount': '13', 'phone': '0702 345678', 'network': 'AIRTEL'}, admin=False)
    check('gift below minimum refused', code == 422, r)
    code, r = call('GET', '/api/admin/gifts')
    check('gift appears in the giving report', any(g['ref'] == ref for g in r['items']) and r['by_fund'][0]['fund'] == 'outreach', r)
    code, csv = call('GET', '/api/admin/gifts.csv', raw=True)
    check('giving CSV export', code == 200 and ref in csv, csv[:200])

    # ---- Forms ----
    code, r = call('POST', '/api/prayer', {'name': 'Ruth', 'contact': 'ruth@example.com', 'topic': 'Healing', 'request': 'Please pray for my mother.', 'private': True}, admin=False)
    check('prayer request saved', code == 200, r)
    code, r = call('POST', '/api/contact', {'first': 'Sam', 'message': ''}, admin=False)
    check('empty contact message refused', code == 422, r)
    code, r = call('POST', '/api/contact', {'first': 'Sam', 'last': 'O', 'email': 'sam@example.com', 'message': 'When is Bible study?'}, admin=False)
    check('contact message saved', code == 200, r)
    code, r = call('GET', '/api/admin/messages')
    check('messages listed for the office', len(r['items']) == 2, r)
    log = open(mail_log).read() if os.path.exists(mail_log) else ''
    check('office emailed about gift, prayer and message', log.count('To: pastor@phomi.test') >= 3, log[:500])

    # ---- Automatic updates by email ----
    call('POST', '/api/admin/r/senders', {'email': 'deacon@phomi.test', 'name': 'Deacon'})
    mails = [
        email('Sermon: Walking by faith', 'Preacher: Pastor Test\nScripture: 2 Corinthians 5:7\nDate: 1 November 2026\n\nWe walk by faith, not by sight.\nhttps://youtu.be/xyz123\n\nSent from my iPhone'),
        email('Photo: Outreach, Kibuku visit', 'Pictures from Saturday', attachments=[('IMG_1.jpg', jpeg(1200, 900), 'image', 'jpeg'), ('IMG_2.jpg', jpeg(900, 1200), 'image', 'jpeg')]),
        email('Event: Youth day', 'Venue: PHOMI hall\nCome all.', sender='deacon@phomi.test'),
        email('Hello', 'Buy cheap watches', sender='spam@example.com'),
        email('Times: prayer change', 'Prayer day: Friday\nPrayer time: 7pm - 9pm'),
        email('Video: Outreach, Kibuku songs', 'Two clips:\nhttps://www.tiktok.com/@phomi/video/7309999999999999999\nhttps://www.youtube.com/watch?v=AbCdEf12345'),
    ]
    imap = subprocess.Popen([sys.executable, os.path.join(API, 'tests', 'fake_imap.py'), str(IMAP_PORT), *mails], stdout=subprocess.PIPE)
    imap.stdout.readline()
    code, r = call('POST', '/api/admin/inbox/test')
    check('mailbox connection test', code == 200 and '6 unread' in r.get('message', ''), r)
    code, r = call('POST', '/api/admin/inbox/run')
    check('inbox run processed 6 emails', code == 200 and r.get('processed') == 6, r)
    imap.wait(timeout=10)
    statuses = [i['status'] for i in r.get('items', [])]
    check('every emailed update waits for approval', statuses == ['review', 'review', 'review', 'rejected', 'review', 'review'], r['items'])

    code, c = call('GET', '/api/content', admin=False)
    check('nothing emailed is public before approval', all(x['title'] != 'Walking by faith' for x in c['sermons']) and len(c['photos']) == 1
          and c['settings'].get('times_prayer_day') == 'Wednesday' and len(c['videos']) == 1, c)

    code, ib = call('GET', '/api/admin/inbox?status=review')
    by_kind = {i['target_type']: i for i in ib['items']}
    token = by_kind['event']['approve_token']
    code, page = call('GET', f'/api/inbox/approve?t={token}', admin=False, raw=True)
    check('approval page shows the update', 'Youth day' in page and 'Approve' in page, page[:300])
    code, page = call('POST', '/api/inbox/approve', form={'t': token, 'do': 'approve'}, admin=False, raw=True)
    check('one-tap approve', 'now on the website' in page, page[:300])
    code, page = call('POST', '/api/inbox/approve', form={'t': token, 'do': 'approve'}, admin=False, raw=True)
    check('approval link works only once', 'already been handled' in page, page[:300])
    for k in ('sermon', 'photo', 'times', 'video'):
        code, r = call('POST', f"/api/admin/inbox/{by_kind[k]['id']}/approve", {})
        check(f'admin approves the emailed {k}', code == 200 and r['status'] == 'published', r)

    code, c = call('GET', '/api/content', admin=False)
    s = [x for x in c['sermons'] if x['title'] == 'Walking by faith']
    check('emailed sermon on the site with fields', s and s[0]['scripture'] == '2 Corinthians 5:7' and s[0]['preached_on'] == '2026-11-01' and 'youtu.be' in s[0]['media_url'] and 'iPhone' not in (s[0]['summary'] or ''), s)
    p = [x for x in c['photos'] if x['category'] == 'Outreach' and x['caption'] == 'Kibuku visit']
    check('emailed photos in gallery under Outreach', len(p) == 2 and p[0]['thumb'].endswith('-sm.jpg'), c['photos'])
    check('times updated from email', c['settings'].get('times_prayer_day') == 'Friday' and c['settings'].get('times_prayer_time') == '7pm - 9pm', c['settings'])
    check('approved event now public', any(e['title'] == 'Youth day' for e in c['events']), c['events'])
    v = [x for x in c['videos'] if x['category'] == 'Outreach']
    check('emailed TikTok and YouTube links became videos', len(v) == 2 and any('tiktok.com' in x['link'] for x in v) and any('youtube.com' in x['link'] for x in v), c['videos'])
    log = open(mail_log).read()
    check('senders get a reply', 'To: deacon@phomi.test' in log and 'is now on the website' in log, log[-600:])
    check('no reply to unknown sender', 'To: spam@example.com' not in log, '')

    # ---- Change history and undo ----
    code, h = call('GET', '/api/admin/changes')
    items = h.get('items', [])
    check('history records who changed what', any(i['actor'] == 'pastor@phomi.test' and i['action'] == 'create' and i['table_name'] == 'sermons' for i in items)
          and any(i['actor'] == 'email: pastor@phomi.test' for i in items) and any(i['actor'] == 'approval link' for i in items), items[:5])
    check('history never stores the mailbox password', all('secret pass' not in json.dumps(i) for i in items), '')
    times_change = next(i for i in items if i['table_name'] == 'settings' and 'service times' in i['summary'])
    code, r = call('POST', f"/api/admin/changes/{times_change['id']}/undo", {})
    code, c = call('GET', '/api/content', admin=False)
    check('undo puts the old service times back', code == 200 and c['settings'].get('times_prayer_day') == 'Wednesday', c['settings'])
    code, r = call('POST', f"/api/admin/changes/{times_change['id']}/undo", {})
    check('a change can only be undone once', code == 409, r)
    code, r = call('POST', f'/api/admin/r/sermons/{sid}/delete', {})
    check('sermon deleted', code == 200, r)
    code, h = call('GET', '/api/admin/changes')
    d = next(i for i in h['items'] if i['action'] == 'delete' and i['table_name'] == 'sermons')
    code, r = call('POST', f"/api/admin/changes/{d['id']}/undo", {})
    code, c = call('GET', '/api/content', admin=False)
    check('undo brings a deleted sermon back', code == 200 and any(x['id'] == sid and x['scripture'] == 'Mark 11:22' for x in c['sermons']), r)
    edit = next(i for i in h['items'] if i['action'] == 'update' and i['table_name'] == 'sermons' and i['row_id'] == sid)
    code, r = call('POST', f"/api/admin/changes/{edit['id']}/undo", {})
    code, c = call('GET', '/api/content', admin=False)
    check('undo reverses an edit', code == 200 and any(x['id'] == sid and x['scripture'] == 'Mark 11:22-24' for x in c['sermons']), r)

    # ---- Clean-up actions ----
    code, r = call('POST', '/api/admin/password', {'current': 'correct horse 1', 'password': 'short'})
    check('weak new password refused', code == 422, r)
    code, r = call('GET', '/api/cron/inbox?token=bad', admin=False)
    check('cron URL needs its token', code == 403, r)
    code, r = call('POST', '/api/admin/logout', {})
    code, r = call('GET', '/api/admin/stats')
    check('signed out', code == 401, r)
finally:
    server.terminate()
    err = server.stderr.read().decode()
    if 'Fatal' in err or 'Warning' in err:
        print('\nPHP server log:\n' + '\n'.join(l for l in err.splitlines() if 'Fatal' in l or 'Warning' in l or 'Deprecated' in l)[:3000])
    shutil.rmtree(tmp, ignore_errors=True)

print(f'\n{len(failures)} failed' if failures else '\nAll API tests passed')
sys.exit(1 if failures else 0)
