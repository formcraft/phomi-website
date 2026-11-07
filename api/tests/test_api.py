"""End-to-end test of the PHOMI API on PHP's built-in server with SQLite.

Run from the repo root:  python3 api/tests/test_api.py
Needs: php 8.1+ (pdo_sqlite, gd, curl, mbstring, fileinfo). No MySQL, payment account or API key needed:
payments use the 'mock' provider and email is read from a fake mailbox.
"""
import http.cookiejar, json, re, os, shutil, subprocess, sys, tempfile, time, urllib.error, urllib.parse, urllib.request
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
  'sms' => ['provider' => 'mock', 'log' => '{tmp}/sms.log'],
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


def base64_subjects(log):
    import base64
    out = []
    for m in re.finditer(r'Subject: =\?UTF-8\?B\?([^?]+)\?=', log):
        out.append(base64.b64decode(m.group(1)).decode('utf-8', 'replace'))
    return '\n'.join(out)


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
    check('installer loads the Bible text', 'Bible text loaded' in page, page[:600])

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

    # ---- Bible and Verse of the Day ----
    code, r = call('GET', '/api/bible/kjv/43/3', admin=False)
    check('Bible chapter loads (John 3, KJV)', code == 200 and len(r['verses']) == 36 and r['verses'][15]['t'].startswith('For God so loved the world'), r.get('verses', [])[:1])
    code, r = call('GET', '/api/bible/web/19/23', admin=False)
    check('World English Bible loads (Psalm 23)', code == 200 and 'Yahweh is my shepherd' in r['verses'][0]['t'], r.get('verses', [])[:1])
    code, r = call('GET', '/api/bible/kjv/70/1', admin=False)
    check('unknown book refused', code == 404, r)
    code, r = call('GET', '/api/bible/search?q=' + urllib.parse.quote('1 cor 13:4-7'), admin=False)
    check('reference search opens the passage', code == 200 and r['passage']['ref'] == '1 Corinthians 13:4-7' and r['highlight'] == [4, 5, 6, 7], r.get('passage'))
    code, r = call('GET', '/api/bible/search?q=' + urllib.parse.quote('living water') + '&tr=kjv', admin=False)
    check('word search finds verses', code == 200 and r['total'] >= 2 and any(x['ref'] == 'John 4:10' for x in r['results']), r.get('total'))
    code, c = call('GET', '/api/content', admin=False)
    vd = c.get('verse', {}).get('day', {})
    check('site content carries the Verse of the Day and Week', vd.get('text') and vd.get('ref') and c['verse']['week'].get('text'), c.get('verse'))
    code, img = call('GET', vd['image'] + '&s=story', admin=False, raw=True)
    check('verse picture is drawn', code == 200, code)

    # ---- Luganda Bible (Bayibuli Entukuvu) ----
    code, r = call('GET', '/api/bible/lug/43/3', admin=False)
    check('Luganda Bible chapter loads (Yokaana 3)', code == 200 and len(r['verses']) == 36 and r['name_lg'] == 'Yokaana' and 'Katonda' in r['verses'][15]['t'], r.get('verses', [])[15:16])
    check('Luganda chapters carry the Biblica credit', 'Biblica' in r.get('credit', '') and 'CC BY-SA' in r.get('credit', ''), r.get('credit'))
    code, r = call('GET', '/api/bible/search?q=' + urllib.parse.quote('Yokaana 3:16') + '&tr=lug', admin=False)
    check('a Luganda reference opens the verse', code == 200 and r['passage']['ref'] == 'Yokaana 3:16' and r['highlight'] == [16], r.get('passage'))
    code, r = call('GET', '/api/bible/search?q=' + urllib.parse.quote('zabbuli 23') + '&tr=lug', admin=False)
    check('Luganda book names work in lower case (zabbuli 23)', code == 200 and r['chapter']['book'] == 19 and r['chapter']['chapter'] == 23, r.get('chapter', {}).get('name'))
    code, r = call('GET', '/api/bible/search?q=' + urllib.parse.quote('John 3:16') + '&tr=lug', admin=False)
    check('English book names also open the Luganda Bible', code == 200 and r['passage']['ref'] == 'Yokaana 3:16', r.get('passage'))
    code, c = call('GET', '/api/content', admin=False)
    vl = c.get('verse_lg', {}).get('day', {})
    check('the site carries the Luganda Verse of the Day', vl.get('translation') == 'lug' and vl.get('text') and vl.get('text') != vd.get('text'), vl)
    code, img = call('GET', vl['image'] + '&s=story', admin=False, raw=True)
    check('Luganda verse picture is drawn', code == 200 and 'tr=lug' in vl['image'], vl.get('image'))

    # ---- Site text: the church's own wording, fonts and colours ----
    code, r = call('POST', '/api/admin/text', {'k': 'home.heroTitle', 'en': 'Made new', 'lg': 'Tufuulibwa abaggya', 'style': {'font': 'Georgia', 'size': 40, 'color': '#1f6f3a', 'weight': 700, 'italic': True}})
    check('admin saves site text in both languages with a style', code == 200 and r['text']['lg'] == 'Tufuulibwa abaggya' and r['text']['style'] == {'font': 'Georgia', 'size': 40, 'color': '#1f6f3a', 'weight': 700, 'italic': True}, r)
    code, r = call('POST', '/api/admin/text', {'k': 'home.heroSub', 'en': '<script>alert(1)</script>', 'style': {'font': "Comic'; } body{display:none", 'size': 900, 'color': 'red;background:url(x)', 'weight': 950}})
    check('bad fonts, sizes and colours are dropped', code == 200 and 'style' not in r['text'], r)
    code, r = call('POST', '/api/admin/text', {'k': '../../etc/passwd', 'en': 'x'})
    check('unknown text keys are refused', code == 422, r)
    code, c = call('GET', '/api/content', admin=False)
    check('the site gets the new wording', c['text']['home.heroTitle']['en'] == 'Made new' and c['text']['home.heroSub']['en'] == '<script>alert(1)</script>', c.get('text'))
    code, r = call('POST', '/api/admin/text', {'k': 'home.heroTitle', 'lg': 'Kakensa ewaka', 'style': {}})
    code, h = call('GET', '/api/admin/changes')
    ch = next(i for i in h['items'] if i['table_name'] == 'site_text' and i['action'] == 'update')
    code, r = call('POST', f"/api/admin/changes/{ch['id']}/undo", {})
    code, c = call('GET', '/api/content', admin=False)
    check('undo brings back the earlier site text', c['text']['home.heroTitle'].get('lg') == 'Tufuulibwa abaggya', c['text'].get('home.heroTitle'))
    code, r = call('POST', '/api/admin/text/reset', {'k': 'home.heroSub'})
    code, c = call('GET', '/api/content', admin=False)
    check('reset puts back the built-in wording', 'home.heroSub' not in c['text'], c.get('text'))
    code, r = call('POST', '/api/admin/settings', {'site_theme': json.dumps({'head': 'Georgia', 'body': 'Comic Sans', 'text': '#222222', 'clay': 'javascript:1', 'scale': 300}), 'default_lang': 'lg'})
    code, c = call('GET', '/api/content', admin=False)
    th = json.loads(c['settings'].get('site_theme') or '{}')
    check('whole-site look keeps only safe values', th == {'head': 'Georgia', 'text': '#222222'}, th)
    check('first language for new visitors is saved', c['settings'].get('default_lang') == 'lg', c['settings'].get('default_lang'))
    call('POST', '/api/admin/settings', {'site_theme': '', 'default_lang': 'en'})

    code, r = call('POST', '/api/admin/r/verses', {'show_on': time.strftime('%Y-%m-%d'), 'kind': 'day', 'reference': 'Not a verse 99', 'theme': 'x'})
    check('planned verse needs a real reference', code == 422, r)
    code, r = call('POST', '/api/admin/r/verses', {'show_on': time.strftime('%Y-%m-%d'), 'kind': 'day', 'reference': 'ps 23:1-3', 'theme': 'Trust', 'note': 'Read it slowly today.'})
    check('admin plans today\'s verse', code == 200 and r['item']['reference'] == 'Psalm 23:1-3', r)
    vid = r['item']['id']
    code, c = call('GET', '/api/content', admin=False)
    check('planned verse shows on the site', c['verse']['day']['ref'] == 'Psalm 23:1-3' and c['verse']['day']['note'] == 'Read it slowly today.', c['verse']['day'])
    code, u = call('GET', '/api/admin/verses/upcoming?days=14')
    check('admin sees the coming verses', code == 200 and len(u['days']) == 14 and u['days'][0]['planned'] and not u['days'][1]['planned'], u.get('days', [])[:2])

    # ---- Verse emails and SMS ----
    code, r = call('POST', '/api/subscribe', {'email': 'not-an-email', 'daily': True}, admin=False)
    check('sign-up needs a real email', code == 422, r)
    code, r = call('POST', '/api/subscribe', {'name': 'Grace', 'email': 'grace@example.com', 'daily': True, 'weekly': True, 'phone': '0772 111222', 'sms': True}, admin=False)
    check('sign-up asks to confirm by email', code == 200 and 'Confirm' in r['message'] and 'SMS' in r['message'], r)
    log = open(mail_log).read()
    m = re.search(r'/api/subscription\?t=([a-f0-9]+)&do=confirm', log)
    check('confirmation email sent', 'To: grace@example.com' in log and m, log[-400:])
    token = m.group(1) if m else ''
    code, page = call('GET', f'/api/subscription?t={token}&do=confirm', admin=False, raw=True)
    check('opening the link alone confirms nothing', 'Confirm' in page and code == 200, page[:200])
    code, page = call('POST', '/api/subscription', form={'t': token, 'do': 'confirm'}, admin=False, raw=True)
    check('pressing Confirm signs them up', 'You are signed up' in page, page[:400])
    code, r = call('POST', '/api/subscribe', {'phone': '0701 999888', 'sms': True}, admin=False)
    check('SMS-only sign-up', code == 200 and 'SMS' in r['message'], r)
    code, r = call('POST', '/api/admin/r/subscribers', {'email': 'deacon@phomi.test', 'name': 'Deacon', 'daily': False, 'weekly': True, 'status': 'active'})
    check('admin adds someone to the email list', code == 200 and r['item']['token'], r)
    code, r = call('GET', '/api/admin/r/sms_contacts')
    check('SMS list keeps numbers in one format', sorted(x['phone'] for x in r['items']) == ['+256701999888', '+256772111222'], r)

    # ---- Phone-only "please call me", and the private copy of the lists ----
    code, r = call('POST', '/api/subscribe', {'call': True}, admin=False)
    check('"please call me" needs a phone number', code == 422 and 'phone' in r.get('error', '').lower(), r)
    call('POST', '/api/admin/settings', {'lists_email': 'private.list@gmail.test'})
    code, r = call('POST', '/api/subscribe', {'name': '=HYPERLINK("http://bad")', 'phone': '0782 333444', 'call': True}, admin=False)
    check('phone-only "please call me" sign-up', code == 200 and 'call you' in r['message'], r)
    log = open(mail_log).read()
    check('the private list address hears about the new sign-up', 'To: private.list@gmail.test' in log and 'Please call: ' in base64_subjects(log) and '+256782333444' in log, log[-500:])
    code, r = call('GET', '/api/admin/lists')
    check('admin sees the list counts and the private address', code == 200 and r['counts']['call'] == 1 and r['to'] == 'private.list@gmail.test' and r['private'], r)
    code, r = call('POST', '/api/admin/lists/send', {})
    log = open(mail_log).read()
    check('both lists are emailed to the private address', code == 200 and r['sent_to'] == 1 and 'Attached: phomi-email-list-' in log and 'phomi-phone-list-' in log, r)
    code, csv = call('GET', '/api/admin/sms_contacts.csv', raw=True)
    check('a name can\'t run as a spreadsheet formula', code == 200 and "'=HYPERLINK" in csv and ',=HYPERLINK' not in csv, csv[:300])
    code, r = call('GET', '/api/content', admin=False)
    check('the private list address is never public', 'private.list@gmail.test' not in json.dumps(r), '')

    # ---- Luganda sign-ups get Luganda answers, emails and SMS ----
    code, r = call('POST', '/api/subscribe', {'phone': '0703 444555', 'sms': True, 'lang': 'lg'}, admin=False)
    check('Luganda sign-up is answered in Luganda', code == 200 and 'Webale' in r['message'], r)
    code, r = call('POST', '/api/subscribe', {'email': 'bad', 'daily': True, 'lang': 'lg'}, admin=False)
    check('Luganda sign-up errors are in Luganda', code == 422 and 'entuufu' in r.get('error', ''), r)
    code, r = call('POST', '/api/admin/r/subscribers', {'email': 'nakato@phomi.test', 'name': 'Nakato', 'daily': True, 'weekly': False, 'status': 'active', 'lang': 'lg'})
    check('admin adds a Luganda reader to the email list', code == 200 and r['item']['lang'] == 'lg', r)
    code, csv = call('GET', '/api/admin/sms_contacts.csv', raw=True)
    check('the phone list shows each language', 'language' in csv and '+256703444555' in csv and 'Luganda' in csv, csv[:300])

    call('POST', '/api/admin/settings', {'letters_on': '1', 'letters_time': '00:00', 'sms_on': '1'})
    code, L = call('GET', '/api/admin/letters')
    todays = [l for l in L['items'] if l['for_date'] == time.strftime('%Y-%m-%d')]
    check('today\'s verse emails are prepared', any(l['kind'] == 'day' for l in todays) and any(l['kind'] == 'sms' for l in todays), [(l['kind'], l['status']) for l in todays])
    day_letter = next(l for l in todays if l['kind'] == 'day')
    code, r = call('POST', f"/api/admin/letters/{day_letter['id']}/pause", {})
    code, r = call('GET', '/api/cron/inbox?token=cron-token-123', admin=False)
    log = open(mail_log).read()
    check('a paused email is not sent', 'Verse of the Day: Psalm 23' not in base64_subjects(log), r)
    code, r = call('POST', f"/api/admin/letters/{day_letter['id']}/resume", {})
    code, r = call('GET', '/api/cron/inbox?token=cron-token-123', admin=False)
    log = open(mail_log).read()
    subj = base64_subjects(log)
    check('the cron job sends the Verse of the Day email', r['letters']['sent'] >= 1 and 'Verse of the Day: Psalm 23:1-3' in subj, r)
    check('verse emails carry a one-click unsubscribe', 'List-Unsubscribe-Post: List-Unsubscribe=One-Click' in log, '')
    sms = open(os.path.join(tmp, 'sms.log')).read() if os.path.exists(os.path.join(tmp, 'sms.log')) else ''
    check('the daily verse goes out by SMS', '+256772111222' in sms and 'Psalm 23:1-3' in sms, sms[:300])
    check('a "please call me" number gets no SMS it did not ask for', '+256782333444' not in sms, sms[:300])
    check('Luganda readers get the Luganda verse email', 'Ekyawandiikibwa kya Leero: Zabbuli 23:1-3' in subj and 'To: nakato@phomi.test' in log, [x for x in subj.split('\n') if 'Ekyawandiikibwa' in x][:2])
    lg_sms = [l for l in sms.split('----') if '+256703444555' in l]
    check('Luganda readers get the Luganda SMS', lg_sms and 'Ekyawandiikibwa kya Leero' in lg_sms[0] and 'Zabbuli 23' in lg_sms[0], sms[-600:])

    code, r = call('GET', '/api/cron/inbox?token=cron-token-123', admin=False)
    check('nobody gets the same email twice', r['letters']['sent'] == 0, r)
    code, r = call('POST', '/api/admin/sms/send', {'phones': '0775 123456'})
    sms = open(os.path.join(tmp, 'sms.log')).read()
    check('admin sends today\'s verse to a number', code == 200 and r['sent'] == 1 and '+256775123456' in sms, r)
    code, page = call('POST', '/api/subscription', form={'t': token, 'do': 'unsubscribe'}, admin=False, raw=True)
    check('unsubscribe works', 'unsubscribed' in page, page[:300])
    code, h = call('GET', '/api/admin/changes')
    pv = next(i for i in h['items'] if i['table_name'] == 'verses' and i['action'] == 'create')
    code, r = call('POST', f"/api/admin/changes/{pv['id']}/undo", {})
    code, c = call('GET', '/api/content', admin=False)
    check('undo removes a planned verse', code == 200 and c['verse']['day']['ref'] != 'Psalm 23:1-3', c['verse']['day']['ref'])

    # ---- Clean-up actions ----
    code, r = call('POST', '/api/admin/password', {'current': 'correct horse 1', 'password': 'short'})
    check('weak new password refused', code == 422, r)
    code, r = call('GET', '/api/cron/inbox?token=bad', admin=False)
    check('cron URL needs its token', code == 403, r)
    code, r = call('POST', '/api/admin/logout', {})
    code, r = call('GET', '/api/admin/stats')
    check('signed out', code == 401, r)
    code, r = call('GET', '/api/admin/lists')
    code2, csv = call('GET', '/api/admin/subscribers.csv', raw=True)
    check('the lists need an admin sign-in', code == 401 and code2 == 401 and '@' not in csv, (code, code2))
finally:
    server.terminate()
    err = server.stderr.read().decode()
    if 'Fatal' in err or 'Warning' in err:
        print('\nPHP server log:\n' + '\n'.join(l for l in err.splitlines() if 'Fatal' in l or 'Warning' in l or 'Deprecated' in l)[:3000])
    shutil.rmtree(tmp, ignore_errors=True)

print(f'\n{len(failures)} failed' if failures else '\nAll API tests passed')
sys.exit(1 if failures else 0)
