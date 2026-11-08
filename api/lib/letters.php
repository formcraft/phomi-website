<?php
declare(strict_types=1);

// Verse emails: people sign up on the website, confirm by email, and receive the Verse of the Day
// and/or a weekly letter (Verse of the Week, the latest sermon, coming events). Every email has
// a one-click unsubscribe. The 5-minute cron job sends them in small batches.

// ---------- Signing up, confirming, unsubscribing ----------

function subscribe_start(array $b): array
{
    $lg = ($b['lang'] ?? '') === 'lg';
    $L = fn(string $en, string $lgText) => $lg ? $lgText : $en; // the answer in the visitor's language
    if (trim((string)($b['website'] ?? '')) !== '') return ['ok' => true, 'message' => $L('Thank you.', 'Webale.')]; // bots fill the hidden field
    $email = strtolower(str_in($b, 'email', 190));
    $name = str_in($b, 'name', 120);
    $phoneRaw = str_in($b, 'phone', 30);
    $wantsSms = !empty($b['sms']) && $phoneRaw !== '';
    $wantsCall = !empty($b['call']) && $phoneRaw !== '';
    if ((!empty($b['sms']) || !empty($b['call'])) && $phoneRaw === '') throw new ApiError(422, $L('Add your phone number, so we can send the SMS or call you.', 'Wandiika ennamba yo ey’essimu, tusobole okukuweereza SMS oba okukukubira.'));
    if ($email === '' && !$wantsSms && !$wantsCall) throw new ApiError(422, $L('Enter your email address, or your phone number for the SMS verse or a call.', 'Wandiika email yo, oba ennamba yo ey’essimu okufuna ekyawandiikibwa ku SMS oba okukubirwa.'));
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new ApiError(422, $L('Please enter a valid email address.', 'Wandiika email entuufu.'));
    $daily = !empty($b['daily']) ? 1 : 0;
    $weekly = !empty($b['weekly']) ? 1 : 0;
    if ($email !== '' && !$daily && !$weekly) throw new ApiError(422, $L('Choose the daily verse, the weekly letter, or both.', 'Londa ekyawandiikibwa kya buli lunaku, ebbaluwa ya buli wiiki, oba byombi.'));
    rate_limit('subscribe:' . client_ip(), 6, 60);
    $smsMsg = '';
    $phone = '';
    $wants = [];
    if ($wantsSms || $wantsCall) {
        $phone = sms_phone($phoneRaw);
        if (!$phone) throw new ApiError(422, $L('That phone number was not understood. Write it like 0772 123456, or with + and the country code.', 'Ennamba eyo tetegeerekese. Giwandiike nga 0772 123456, oba ne + n’ennamba y’eggwanga.'));
        $c = row('SELECT * FROM sms_contacts WHERE phone = ?', [$phone]);
        $daily = $wantsSms ? 1 : (int)($c['daily'] ?? 0);
        $call = $wantsCall ? 1 : (int)($c['call_me'] ?? 0);
        if ($c) q("UPDATE sms_contacts SET status = 'active', daily = ?, call_me = ?, name = ?, lang = ? WHERE id = ?", [$daily, $call, $name ?: $c['name'], $lg ? 'lg' : 'en', $c['id']]);
        else insert('sms_contacts', ['phone' => $phone, 'name' => $name, 'daily' => $daily, 'call_me' => $call, 'lang' => $lg ? 'lg' : 'en', 'status' => 'active', 'source' => 'website', 'created_at' => now()]);
        if ($wantsSms) $wants[] = 'the Verse of the Day by SMS';
        if ($wantsCall) $wants[] = 'a call from the church';
        if ($lg) $wants[] = 'messages in Luganda';
        $smsMsg = $wantsCall ? $L(' Someone from the church will call you.', ' Omu ku b’ekkanisa ajja kukukubira.') : $L(' Your number is on the SMS list.', ' Ennamba yo eri ku lukalala lwa SMS.');
    }
    if ($email === '') {
        lists_alert_signup(['name' => $name, 'email' => '', 'phone' => $phone, 'wants' => $wants]);
        return ['ok' => true, 'message' => $wantsCall
            ? $L('Thank you. Someone from the church will call you soon.', 'Webale. Omu ku b’ekkanisa ajja kukukubira mangu.') . ($wantsSms ? $L(' Your number is also on the SMS verse list.', ' Ennamba yo era eri ku lukalala lw’ebyawandiikibwa ku SMS.') : '')
            : $L('Thank you. Your number is on the list for the Verse of the Day by SMS.', 'Webale. Ennamba yo eri ku lukalala lw’Ekyawandiikibwa kya Leero ku SMS.')];
    }
    rate_limit('subscribe:' . $email, 3, 60 * 24);
    if (!empty($b['daily'])) $wants[] = 'the Verse of the Day by email';
    if (!empty($b['weekly'])) $wants[] = 'the weekly letter';
    if ($lg && !in_array('messages in Luganda', $wants, true)) $wants[] = 'messages in Luganda';

    $s = row('SELECT * FROM subscribers WHERE email = ?', [$email]);
    if ($s && $s['status'] === 'active') {
        send_mail($email, 'You already get the verse emails', "Hello" . ($s['name'] ? " {$s['name']}" : '') . ",\n\nThis address already receives the verse emails from Potter's House. "
            . "To change what you receive or to stop, open:\n" . subscriber_link($s, 'manage') . "\n\nPotter's House Outreach Ministries International");
    } else {
        $token = random_token(20);
        if ($s) {
            q('UPDATE subscribers SET name = ?, daily = ?, weekly = ?, status = ?, token = ?, lang = ? WHERE id = ?', [$name ?: $s['name'], $daily, $weekly, 'pending', $token, $lg ? 'lg' : 'en', $s['id']]);
        } else {
            insert('subscribers', ['email' => $email, 'name' => $name, 'daily' => $daily, 'weekly' => $weekly, 'status' => 'pending', 'token' => $token, 'lang' => $lg ? 'lg' : 'en', 'source' => 'website', 'created_at' => now()]);
        }
        $s = row('SELECT * FROM subscribers WHERE email = ?', [$email]);
        if ($lg) {
            $what = $daily && $weekly ? 'Ekyawandiikibwa kya Leero n’ebbaluwa ya buli wiiki' : ($daily ? 'Ekyawandiikibwa kya Leero' : 'ebbaluwa ya buli wiiki');
            send_mail($email, 'Kakasa: email z’ebyawandiikibwa okuva mu Potter\'s House', "Gyebale ko" . ($name ? " $name" : '') . ",\n\nOmuntu (tusuubira ggwe) asabye okufuna $what okuva mu Potter's House Outreach Ministries International.\n\n"
                . "Kakasa wano:\n" . subscriber_link($s, 'confirm') . "\n\nBw’oba si ggwe, leka email eno era tewali kijja kuweerezebwa.\n\n(English: someone asked to receive verse emails at this address. Press the link above to confirm, or ignore this email.)\n\nPotter's House Outreach Ministries International");
        } else {
            $what = $daily && $weekly ? 'the Verse of the Day and the weekly letter' : ($daily ? 'the Verse of the Day' : 'the weekly letter');
            send_mail($email, 'Please confirm: verse emails from Potter\'s House', "Hello" . ($name ? " $name" : '') . ",\n\nSomeone (we hope you) asked to receive $what from Potter's House Outreach Ministries International.\n\n"
                . "Confirm here:\n" . subscriber_link($s, 'confirm') . "\n\nIf this wasn't you, ignore this email and nothing will be sent.\n\nPotter's House Outreach Ministries International");
        }
    }
    if (!$s || $s['status'] !== 'active') lists_alert_signup(['name' => $name, 'email' => $email, 'phone' => $phone, 'wants' => $wants]);
    return ['ok' => true, 'message' => $L('Almost done. We sent you an email: open it and press Confirm.', 'Kumpi kuggwa. Tukuweerezza email: gigulewo onyige Kakasa (Confirm).') . $smsMsg];
}

function subscriber_link(array $s, string $do): string
{
    return site_url('/api/subscription?t=' . $s['token'] . ($do === 'manage' ? '' : "&do=$do"));
}

// The small page that the links in the emails open. Changes only happen when a button is pressed (POST),
// so email scanners that open links can't confirm or unsubscribe anyone.
function subscription_page(string $method): void
{
    $t = preg_replace('/[^a-f0-9]/', '', (string)($_GET['t'] ?? $_POST['t'] ?? ''));
    $s = $t !== '' ? row('SELECT * FROM subscribers WHERE token = ?', [$t]) : null;
    $do = (string)($_POST['do'] ?? $_GET['do'] ?? '');

    // One-click unsubscribe from the mail app's own button (RFC 8058)
    if ($method === 'POST' && ($_POST['List-Unsubscribe'] ?? '') === 'One-Click') {
        if ($s) q("UPDATE subscribers SET status = 'unsubscribed' WHERE id = ?", [$s['id']]);
        http_response_code(200);
        echo 'Unsubscribed';
        return;
    }

    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'");
    $h = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES);
    $msg = '';
    if (!$s) {
        $msg = 'This link is not valid any more. You can sign up again on the website.';
    } elseif ($method === 'POST') {
        if ($do === 'confirm') {
            q("UPDATE subscribers SET status = 'active', confirmed_at = ? WHERE id = ?", [now(), $s['id']]);
            $msg = 'Thank you. You are signed up. The first verse arrives tomorrow morning.';
        } elseif ($do === 'unsubscribe') {
            q("UPDATE subscribers SET status = 'unsubscribed' WHERE id = ?", [$s['id']]);
            $msg = 'You have been unsubscribed. You will not receive any more verse emails.';
        } elseif ($do === 'save') {
            $daily = !empty($_POST['daily']) ? 1 : 0;
            $weekly = !empty($_POST['weekly']) ? 1 : 0;
            q('UPDATE subscribers SET daily = ?, weekly = ?, status = ? WHERE id = ?', [$daily, $weekly, $daily || $weekly ? 'active' : 'unsubscribed', $s['id']]);
            $msg = $daily || $weekly ? 'Saved.' : 'You have been unsubscribed.';
        }
        $s = row('SELECT * FROM subscribers WHERE id = ?', [$s['id']]);
    }

    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Verse emails</title>';
    echo '<body style="font-family:system-ui,sans-serif;background:#F4EDE1;color:#1B2A47;margin:0;padding:32px 16px"><main style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:24px">';
    echo '<p style="margin:0 0 4px;color:#8a6a1f;font-size:12px;letter-spacing:.14em;text-transform:uppercase">Potter\'s House</p><h1 style="margin:0 0 16px;font-size:24px">Verse emails</h1>';
    if ($msg) echo '<p style="font-size:17px;background:#F4EDE1;border-radius:8px;padding:12px">' . $h($msg) . '</p>';
    if ($s) {
        $btn = 'padding:12px 16px;border:0;border-radius:8px;font-size:16px;cursor:pointer';
        if ($s['status'] === 'pending' && $method !== 'POST') {
            echo '<p>Confirm that <b>' . $h($s['email']) . '</b> should receive the verse emails.</p>';
            echo '<form method="post"><input type="hidden" name="t" value="' . $h($t) . '"><button name="do" value="confirm" style="' . $btn . ';background:#A03207;color:#fff;width:100%">Confirm</button></form>';
        } elseif ($do === 'unsubscribe' && $method !== 'POST' && $s['status'] !== 'unsubscribed') {
            echo '<p>Stop all verse emails to <b>' . $h($s['email']) . '</b>?</p>';
            echo '<form method="post"><input type="hidden" name="t" value="' . $h($t) . '"><button name="do" value="unsubscribe" style="' . $btn . ';background:#1B2A47;color:#fff;width:100%">Unsubscribe</button></form>';
        }
        if ($s['status'] !== 'pending') {
            echo '<form method="post" style="margin-top:20px;border-top:1px solid #eee;padding-top:16px"><input type="hidden" name="t" value="' . $h($t) . '"><p style="margin:0 0 8px">What should <b>' . $h($s['email']) . '</b> receive?</p>';
            echo '<label style="display:block;padding:6px 0"><input type="checkbox" name="daily" value="1"' . ($s['daily'] && $s['status'] === 'active' ? ' checked' : '') . '> Verse of the Day, every morning</label>';
            echo '<label style="display:block;padding:6px 0"><input type="checkbox" name="weekly" value="1"' . ($s['weekly'] && $s['status'] === 'active' ? ' checked' : '') . '> Weekly letter on Monday: Verse of the Week, the latest sermon and coming events</label>';
            echo '<button name="do" value="save" style="' . $btn . ';background:#A03207;color:#fff;margin-top:8px">Save</button></form>';
        }
    }
    echo '<p style="margin-top:20px"><a href="/" style="color:#A03207">Go to the website</a></p></main></body>';
}

// ---------- Sending ----------

function letters_time(): string
{
    $t = setting('letters_time');
    return preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $t) ? $t : '06:00';
}

// Makes sure the emails for the coming days exist, so the admin can see and pause them in advance.
function letters_prepare(int $days = 7): void
{
    $mode = setting('letters_mode') === 'approve' ? 'waiting' : 'scheduled';
    $time = letters_time();
    for ($i = 0; $i < $days; $i++) {
        $d = date('Y-m-d', strtotime("+$i days"));
        $kinds = ['day'];
        if (date('N', strtotime($d)) === '1') $kinds[] = 'week';
        if (setting('sms_on') === '1') $kinds[] = 'sms';
        foreach ($kinds as $k) {
            if (!row('SELECT id FROM letters WHERE kind = ? AND for_date = ?', [$k, $d])) {
                insert('letters', ['kind' => $k, 'for_date' => $d, 'note' => '', 'status' => $mode, 'send_after' => "$d $time:00", 'cursor_id' => 0, 'sent_count' => 0, 'created_at' => now()]);
            }
        }
    }
}

// Called by the cron job. Sends due emails within the hourly limit of the mail server.
function letters_tick(): array
{
    $emailsOn = setting('letters_on') === '1';
    if (!$emailsOn && setting('sms_on') !== '1') return ['sent' => 0, 'note' => 'Verse emails and SMS are switched off'];
    letters_prepare(3);
    $today = date('Y-m-d');
    // A day that was missed (server down, emails paused) is not sent late
    q("UPDATE letters SET status = 'skipped' WHERE status IN ('scheduled', 'waiting') AND for_date < ?", [$today]);
    $perHour = max(10, (int)config('letters_per_hour', 100));
    $since = date('Y-m-d H:i:s', time() - 3600);
    $budget = $perHour - (int)(row("SELECT COUNT(*) AS n FROM hits WHERE bucket = 'letter-mail' AND created_at > ?", [$since])['n'] ?? 0);
    $budget = min($budget, (int)ceil($perHour / 12) + 5); // spread over the hour
    $sent = 0;
    $sms = 0;
    try {
        $sms = sms_tick();
    } catch (Throwable $e) {
        error_log('PHOMI SMS: ' . $e->getMessage());
    }
    if (!$emailsOn) $budget = 0;
    foreach (rows("SELECT * FROM letters WHERE kind IN ('day', 'week') AND status IN ('scheduled', 'sending') AND send_after <= ? ORDER BY kind DESC, for_date", [now()]) as $l) {
        if ($budget <= 0) break;
        if ($l['status'] === 'scheduled') q("UPDATE letters SET status = 'sending' WHERE id = ?", [$l['id']]);
        $subs = rows('SELECT * FROM subscribers WHERE ' . letter_audience_sql($l) . ' AND id > ? ORDER BY id LIMIT ' . $budget, [(int)$l['cursor_id']]);
        foreach ($subs as $s) {
            [$subject, $text, $html] = letter_render($l, $s);
            $unsub = site_url('/api/subscription?t=' . $s['token']);
            send_mail_html($s['email'], $subject, $text, $html, ["List-Unsubscribe: <$unsub&do=unsubscribe>", 'List-Unsubscribe-Post: List-Unsubscribe=One-Click']);
            insert('hits', ['bucket' => 'letter-mail', 'created_at' => now()]);
            q('UPDATE letters SET cursor_id = ?, sent_count = sent_count + 1 WHERE id = ?', [$s['id'], $l['id']]);
            $sent++;
            $budget--;
        }
        $left = (int)(row('SELECT COUNT(*) AS n FROM subscribers WHERE ' . letter_audience_sql($l) . ' AND id > ?', [(int)(row('SELECT cursor_id FROM letters WHERE id = ?', [$l['id']])['cursor_id'])])['n'] ?? 0);
        if ($left === 0) q("UPDATE letters SET status = 'sent', sent_at = ? WHERE id = ?", [now(), $l['id']]);
    }
    return ['sent' => $sent, 'sms' => $sms];
}

// Who receives a letter. On Mondays, people who get the weekly letter don't also get the daily email.
function letter_audience_sql(array $l): string
{
    if ($l['kind'] === 'week') return "status = 'active' AND weekly = 1";
    $monday = date('N', strtotime($l['for_date'] . ' 12:00:00')) === '1';
    return "status = 'active' AND daily = 1" . ($monday ? ' AND weekly = 0' : '');
}

function letter_audience_count(array $l): int
{
    if ($l['kind'] === 'sms') return (int)(row("SELECT COUNT(*) AS n FROM sms_contacts WHERE status = 'active' AND daily = 1")['n'] ?? 0);
    return (int)(row('SELECT COUNT(*) AS n FROM subscribers WHERE ' . letter_audience_sql($l))['n'] ?? 0);
}

// Builds one email: [subject, plain text, HTML]
function letter_render(array $l, ?array $s = null): array
{
    $lg = ($s['lang'] ?? '') === 'lg'; // people who signed up in Luganda get the Luganda Bible and wording
    $W = fn(string $en, string $lgText) => $lg ? $lgText : $en;
    $v = verse_for($l['for_date'], $l['kind'], $lg ? 'lug' : '');
    $h = fn($x) => htmlspecialchars((string)$x, ENT_QUOTES);
    $site = site_url('');
    $hello = $s && $s['name'] ? $W('Hello ', 'Gyebale ko ') . $s['name'] . ',' : '';
    $read = site_url('/bible?ref=' . rawurlencode($v['ref']) . ($lg ? '&tr=lug&lang=lg' : ''));
    $img = site_url("/api/verse/image?d={$v['date']}&k={$v['kind']}&s=post" . ($lg ? '&tr=lug' : ''));
    $trName = $v['translation'] === 'lug' ? 'Luganda' : strtoupper($v['translation']);
    $share = 'https://wa.me/?text=' . rawurlencode("“{$v['text']}” {$v['ref']}\n\n$read");
    $manage = $s ? site_url('/api/subscription?t=' . $s['token']) : site_url('/bible');
    $note = trim((string)($l['note'] ?? '')) ?: trim((string)$v['note']);

    $sections = '';
    $textSections = '';
    if ($l['kind'] === 'week') {
        $subject = $W("This week at Potter's House: ", "Wiiki eno mu Potter's House: ") . $v['theme'];
        $sermon = row("SELECT title, preacher, preached_on FROM sermons WHERE status = 'live' AND preached_on >= ? ORDER BY preached_on DESC, id DESC LIMIT 1", [date('Y-m-d', strtotime($l['for_date'] . ' -8 days'))]);
        if ($sermon) {
            $by = trim(($sermon['preacher'] ? $sermon['preacher'] . ', ' : '') . date('j M', strtotime($sermon['preached_on'])), ', ');
            $sections .= '<h2 style="font:600 18px Georgia,serif;margin:28px 0 6px">' . $W('Last Sunday\'s message', 'Obubaka bwa Ssande ewedde') . '</h2><p style="margin:0"><a href="' . $h(site_url('/sermons')) . '" style="color:#A03207">' . $h($sermon['title']) . '</a> (' . $h($by) . ')</p>';
            $textSections .= "\n" . $W("LAST SUNDAY'S MESSAGE", 'OBUBAKA BWA SSANDE EWEDDE') . "\n{$sermon['title']} ($by)\n" . site_url('/sermons') . "\n";
        }
        $events = rows("SELECT title, starts_at, venue FROM events WHERE status = 'live' AND starts_at >= ? AND starts_at < ? ORDER BY starts_at LIMIT 5",
            [$l['for_date'] . ' 00:00:00', date('Y-m-d', strtotime($l['for_date'] . ' +15 days')) . ' 00:00:00']);
        if ($events) {
            $sections .= '<h2 style="font:600 18px Georgia,serif;margin:28px 0 6px">' . $W('Coming up', 'Ebijja') . '</h2><ul style="margin:0;padding-left:18px">';
            $textSections .= "\n" . $W('COMING UP', 'EBIJJA') . "\n";
            foreach ($events as $e) {
                $when = date('D j M, g:ia', strtotime($e['starts_at']));
                $sections .= '<li style="margin:4px 0"><b>' . $h($e['title']) . '</b>, ' . $h($when) . ($e['venue'] ? ', ' . $h($e['venue']) : '') . '</li>';
                $textSections .= "- {$e['title']}, $when" . ($e['venue'] ? ", {$e['venue']}" : '') . "\n";
            }
            $sections .= '</ul>';
        }
        $news = rows("SELECT title FROM announcements WHERE status = 'live' AND (starts_on IS NULL OR starts_on <= ?) AND (ends_on IS NULL OR ends_on >= ?) ORDER BY id DESC LIMIT 3", [$l['for_date'], $l['for_date']]);
        if ($news) {
            $sections .= '<h2 style="font:600 18px Georgia,serif;margin:28px 0 6px">' . $W('Notices', 'Ebirango') . '</h2><ul style="margin:0;padding-left:18px">';
            $textSections .= "\n" . $W('NOTICES', 'EBIRANGO') . "\n";
            foreach ($news as $n) {
                $sections .= '<li style="margin:4px 0">' . $h($n['title']) . '</li>';
                $textSections .= "- {$n['title']}\n";
            }
            $sections .= '</ul>';
        }
        $sections .= '<p style="margin:28px 0 0">' . $W('Need prayer?', 'Oyagala okusabirwa?') . ' <a href="' . $h(site_url('/prayer')) . '" style="color:#A03207">' . $W('Send a prayer request', 'Tuweereze ky’oyagala tusabire') . '</a>. ' . $W('The pastoral team prays over every one.', 'Abasumba basabira buli kimu.') . '</p>';
        $textSections .= "\n" . $W('Need prayer? Send a prayer request: ', 'Oyagala okusabirwa? Tuweereze: ') . site_url('/prayer') . "\n";
        $eyebrow = $W('Verse of the Week', 'Ekyawandiikibwa kya Wiiki');
    } else {
        $subject = $W('Verse of the Day: ', 'Ekyawandiikibwa kya Leero: ') . $v['ref'];
        $eyebrow = $W('Verse of the Day', 'Ekyawandiikibwa kya Leero');
    }

    $text = ($hello ? "$hello\n\n" : '') . strtoupper($eyebrow) . " · {$v['theme']}\n\n“{$v['text']}”\n{$v['ref']} ($trName)\n"
        . ($note ? "\n$note\n" : '') . "\n" . $W('Read the whole chapter: ', 'Soma essuula yonna: ') . "$read\n" . $W('Share on WhatsApp: ', 'Gabana ku WhatsApp: ') . "$share\n$textSections"
        . "\n--\nPotter's House Outreach Ministries International\nBurweta, Butebo District · P.O. Box 260208, Pallisa, Uganda\n$site\n\n" . $W('Change what you receive or unsubscribe: ', 'Kyusa by’ofuna oba lekera awo: ') . "$manage\n";

    $html = '<!doctype html><html><body style="margin:0;background:#F4EDE1"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4EDE1"><tr><td align="center" style="padding:24px 12px">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFCF7;border-radius:12px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:#1B2A47;font-size:16px;line-height:1.6">'
        . '<tr><td style="background:#1B2A47;padding:18px 24px;color:#F4EDE1;font:600 13px Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase">Potter\'s House · ' . $h($eyebrow) . '</td></tr>'
        . '<tr><td><a href="' . $h($read) . '"><img src="' . $h($img) . '" width="560" alt="' . $h('“' . $v['text'] . '” ' . $v['ref']) . '" style="display:block;width:100%;height:auto;border:0"></a></td></tr>'
        . '<tr><td style="padding:24px">'
        . ($hello ? '<p style="margin:0 0 12px">' . $h($hello) . '</p>' : '')
        . '<p style="margin:0;color:#8a6a1f;font-size:12px;letter-spacing:.14em;text-transform:uppercase">' . $h($v['theme']) . '</p>'
        . '<p style="margin:6px 0 4px;font:italic 21px/1.5 Georgia,serif">“' . $h($v['text']) . '”</p>'
        . '<p style="margin:0;font-weight:bold;color:#A03207">' . $h($v['ref']) . ' <span style="color:#5B6478;font-weight:normal">(' . $h($trName) . ')</span></p>'
        . ($note ? '<p style="margin:18px 0 0;white-space:pre-line">' . $h($note) . '</p>' : '')
        . '<p style="margin:20px 0 0"><a href="' . $h($read) . '" style="display:inline-block;background:#A03207;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;font-weight:bold;font-size:14px">' . $W('Read the chapter', 'Soma essuula') . '</a> &nbsp; '
        . '<a href="' . $h($share) . '" style="display:inline-block;background:#1B2A47;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;font-weight:bold;font-size:14px">' . $W('Share on WhatsApp', 'Gabana ku WhatsApp') . '</a></p>'
        . $sections
        . '</td></tr><tr><td style="padding:18px 24px;border-top:1px solid #E4D9C6;font-size:12px;color:#5B6478">Potter\'s House Outreach Ministries International<br>Burweta, Butebo District · P.O. Box 260208, Pallisa, Uganda<br>'
        . '<a href="' . $h($site) . '" style="color:#5B6478">' . $h(preg_replace('#^https?://#', '', $site)) . '</a> · <a href="' . $h($manage) . '" style="color:#5B6478">' . $W('Change what you receive or unsubscribe', 'Kyusa by’ofuna oba lekera awo') . '</a></td></tr>'
        . '</table></td></tr></table></body></html>';
    return [$subject, $text, $html];
}

function letters_admin_list(): array
{
    letters_prepare(7);
    $items = rows('SELECT * FROM letters WHERE for_date >= ? ORDER BY for_date DESC, kind DESC LIMIT 40', [date('Y-m-d', strtotime('-21 days'))]);
    foreach ($items as &$l) {
        $v = verse_for($l['for_date'], $l['kind']);
        $l['ref'] = $v['ref'];
        $l['theme'] = $v['theme'];
        $l['text'] = $v['text'];
        $l['audience'] = letter_audience_count($l);
        if ($l['kind'] === 'sms') $l['sms_text'] = sms_verse_text($v);
    }
    return [
        'items' => $items,
        'on' => setting('letters_on') === '1',
        'mode' => setting('letters_mode') ?: 'auto',
        'time' => letters_time(),
        'subscribers' => [
            'active' => (int)(row("SELECT COUNT(*) AS n FROM subscribers WHERE status = 'active'")['n'] ?? 0),
            'daily' => (int)(row("SELECT COUNT(*) AS n FROM subscribers WHERE status = 'active' AND daily = 1")['n'] ?? 0),
            'weekly' => (int)(row("SELECT COUNT(*) AS n FROM subscribers WHERE status = 'active' AND weekly = 1")['n'] ?? 0),
            'pending' => (int)(row("SELECT COUNT(*) AS n FROM subscribers WHERE status = 'pending'")['n'] ?? 0),
        ],
        'per_hour' => (int)config('letters_per_hour', 100),
        'sms' => ['on' => setting('sms_on') === '1', 'provider' => sms_provider(), 'contacts' => (int)(row("SELECT COUNT(*) AS n FROM sms_contacts WHERE status = 'active'")['n'] ?? 0)],
    ];
}

function letter_action(int $id, string $do, array $admin): array
{
    $l = row('SELECT * FROM letters WHERE id = ?', [$id]);
    if (!$l) throw new ApiError(404, 'That email was not found.');
    $map = ['pause' => ['scheduled', 'waiting'], 'resume' => ['paused'], 'approve' => ['waiting', 'paused']];
    if ($do === 'test' && $l['kind'] === 'sms') {
        return ['ok' => true, 'message' => 'The SMS will read: ' . sms_verse_text(verse_for($l['for_date'], 'day'))];
    }
    if ($do === 'test') {
        [$subject, $text, $html] = letter_render($l, ['name' => $admin['name'] ?? '', 'token' => 'test', 'email' => $admin['email']]);
        send_mail_html($admin['email'], "[Test] $subject", $text, $html);
        return ['ok' => true, 'message' => "A test copy was sent to {$admin['email']}."];
    }
    if ($do === 'note') {
        $note = mb_substr(trim((string)(body()['note'] ?? '')), 0, 2000);
        $old = (string)$l['note'];
        q('UPDATE letters SET note = ? WHERE id = ?', [$note, $id]);
        log_change('update', 'letters', $id, ['note' => $old], ['note' => $note], 'Changed the message in the ' . (['week' => 'weekly letter', 'sms' => 'verse SMS'][$l['kind']] ?? 'verse email') . ' for ' . $l['for_date']);
        return ['ok' => true];
    }
    if (!isset($map[$do]) || !in_array($l['status'], $map[$do], true)) throw new ApiError(409, 'That email can no longer be changed.');
    $new = $do === 'pause' ? 'paused' : 'scheduled';
    q('UPDATE letters SET status = ? WHERE id = ?', [$new, $id]);
    $word = ['pause' => 'Paused', 'resume' => 'Resumed', 'approve' => 'Approved'][$do];
    log_change('update', 'letters', $id, ['status' => $l['status']], ['status' => $new], "$word the " . (['week' => 'weekly letter', 'sms' => 'verse SMS'][$l['kind']] ?? 'verse email') . ' for ' . $l['for_date']);
    return ['ok' => true];
}
