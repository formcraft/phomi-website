<?php
// PHOMI website API. Every /api/... request comes here (see api/.htaccess).
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = '/' . trim(preg_replace('#^.*?/api(?=/|$)#', '', $path), '/');

try {
    route($method, $path);
} catch (ApiError $e) {
    json_out(['error' => $e->getMessage()] + $e->extra, $e->status);
} catch (Throwable $e) {
    error_log('PHOMI API: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    json_out(['error' => config('debug') ? $e->getMessage() : 'Something went wrong on our side. Please try again.'], 500);
}

function route(string $method, string $path): void
{
    $seg = array_values(array_filter(explode('/', $path), 'strlen'));
    $is = fn(string $m, string $p) => $method === $m && $path === $p;

    // ---------- Public ----------
    if ($is('GET', '/health')) {
        $db = false;
        try { db()->query('SELECT 1'); $db = true; } catch (Throwable $e) {}
        json_out(['ok' => true, 'database' => $db, 'payments' => payment_provider() ?: 'off', 'php' => PHP_VERSION]);
        return;
    }
    if ($is('GET', '/content')) {
        // Browsers check back every visit (no-cache) but only download again when something changed
        $json = json_encode(public_content(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $etag = '"' . md5($json) . '"';
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-cache');
        header("ETag: $etag");
        if (trim((string)($_SERVER['HTTP_IF_NONE_MATCH'] ?? '')) === $etag) {
            http_response_code(304);
            return;
        }
        echo $json;
        return;
    }
    if ($is('POST', '/give')) {
        json_out(give_start(body()));
        return;
    }
    if ($method === 'GET' && ($seg[0] ?? '') === 'give' && isset($seg[1])) {
        json_out(give_status($seg[1]));
        return;
    }
    if ($method === 'POST' && ($seg[0] ?? '') === 'webhook' && isset($seg[1])) {
        json_out(webhook($seg[1]));
        return;
    }
    if ($method === 'POST' && in_array($path, ['/prayer', '/contact'], true)) {
        json_out(save_message(substr($path, 1), body()));
        return;
    }
    // ---------- Bible and verses ----------
    if ($method === 'GET' && ($seg[0] ?? '') === 'bible' && count($seg) === 4) {
        header('Cache-Control: public, max-age=86400');
        json_out(bible_chapter($seg[1], (int)$seg[2], (int)$seg[3]));
        return;
    }
    if ($is('GET', '/bible/search')) {
        $q = trim((string)($_GET['q'] ?? ''));
        $tr = (string)($_GET['tr'] ?? '');
        $p = bible_parse_ref($q);
        if ($p && ($pass = bible_passage($q, $tr))) {
            json_out(['passage' => $pass, 'chapter' => bible_chapter($pass['translation'], $p[0], $p[1]), 'highlight' => $p[2] === null ? [] : range($p[2], $p[3])]);
        } else {
            rate_limit('search:' . client_ip(), 60, 5);
            json_out(bible_search($q, $tr));
        }
        return;
    }
    if ($is('GET', '/verse')) {
        $d = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($_GET['d'] ?? '')) ? $_GET['d'] : date('Y-m-d');
        json_out(['day' => verse_for($d, 'day', (string)($_GET['tr'] ?? '')), 'week' => verse_for($d, 'week', (string)($_GET['tr'] ?? ''))]);
        return;
    }
    if ($is('GET', '/verse/image')) {
        $d = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($_GET['d'] ?? '')) ? $_GET['d'] : date('Y-m-d');
        if (abs(strtotime($d) - time()) > 120 * 86400) throw new ApiError(404, 'Pictures are made for dates near today only.');
        $file = verse_image($d, (string)($_GET['k'] ?? 'day'), (string)($_GET['s'] ?? 'post'));
        header('Content-Type: image/jpeg');
        header('Cache-Control: public, max-age=3600');
        if (isset($_GET['download'])) header('Content-Disposition: attachment; filename="verse-' . basename($file) . '"');
        readfile($file);
        return;
    }
    if ($is('POST', '/subscribe')) {
        json_out(subscribe_start(body()));
        return;
    }
    if ($path === '/subscription') {
        subscription_page($method);
        return;
    }
    if ($path === '/inbox/approve') {
        approve_page($method);
        return;
    }
    if ($is('GET', '/cron/inbox')) {
        $t = (string)config('cron_token');
        if ($t === '' || !hash_equals($t, (string)($_GET['token'] ?? ''))) throw new ApiError(403, 'Bad token.');
        try {
            $r = ingest_run();
        } catch (Throwable $e) {
            $r = ['ok' => false, 'message' => $e->getMessage()];
        }
        try {
            $r['letters'] = letters_tick();
        } catch (Throwable $e) {
            $r['letters'] = ['ok' => false, 'message' => $e->getMessage()];
        }
        try {
            $r['lists'] = lists_tick();
        } catch (Throwable $e) {
            $r['lists'] = ['ok' => false, 'message' => $e->getMessage()];
        }
        json_out($r);
        return;
    }

    // ---------- Admin ----------
    if (($seg[0] ?? '') !== 'admin') throw new ApiError(404, 'Not found.');
    $sub = '/' . implode('/', array_slice($seg, 1));

    if ($method === 'POST' && $sub === '/login') {
        if (($_SERVER['HTTP_X_PHOMI'] ?? '') !== '1') throw new ApiError(403, 'Missing request header.');
        $b = body();
        json_out(['admin' => admin_login(str_in($b, 'email', 190), (string)($b['password'] ?? ''))]);
        return;
    }
    if ($method === 'POST' && $sub === '/logout') {
        admin_logout();
        json_out(['ok' => true]);
        return;
    }
    $admin = require_admin();
    actor($admin['email']);

    if ($method === 'GET' && $sub === '/me') {
        json_out(['admin' => $admin]);
        return;
    }
    if ($method === 'GET' && $sub === '/schema') {
        json_out(['resources' => resources(), 'settings' => array_keys(SETTING_DEFAULTS), 'categories' => gallery_categories()]);
        return;
    }
    if ($method === 'GET' && $sub === '/stats') {
        json_out(admin_stats());
        return;
    }
    if ($method === 'POST' && $sub === '/upload') {
        $f = $_FILES['file'] ?? null;
        if (!$f || ($f['error'] ?? 1) !== UPLOAD_ERR_OK) {
            $code = $f['error'] ?? -1;
            throw new ApiError(422, in_array($code, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)
                ? 'That file is too big for the server. Raise upload_max_filesize in hPanel → PHP Configuration.'
                : 'No file was received.');
        }
        json_out(store_media((string)file_get_contents($f['tmp_name']), (string)$f['name'], (string)$f['type']));
        return;
    }

    // Generic sections: /admin/r/<resource>[/<id>[/delete]]
    if (($seg[1] ?? '') === 'r' && isset($seg[2])) {
        $res = $seg[2];
        resource($res);
        $id = isset($seg[3]) ? (int)$seg[3] : 0;
        if ($method === 'GET' && !$id) {
            json_out(['items' => resource_list($res, ['status' => $_GET['status'] ?? '', 'q' => $_GET['q'] ?? '', 'limit' => $_GET['limit'] ?? 200])]);
        } elseif ($method === 'POST' && !$id) {
            json_out(['item' => resource_create($res, body())]);
        } elseif ($method === 'POST' && ($seg[4] ?? '') === 'delete') {
            resource_delete($res, $id);
            json_out(['ok' => true]);
        } elseif ($method === 'POST') {
            json_out(['item' => resource_update($res, $id, body())]);
        } else {
            throw new ApiError(405, 'Not allowed.');
        }
        return;
    }

    if ($sub === '/settings') {
        if ($method === 'POST') {
            $vals = [];
            foreach (body() as $k => $v) {
                if (!is_scalar($v)) continue;
                if (in_array($k, SECRET_SETTINGS, true) && $v === '') continue; // blank = keep the saved password
                $vals[(string)$k] = mb_substr(trim((string)$v), 0, 300);
            }
            settings_save($vals);
        }
        $s = settings_all();
        foreach (SECRET_SETTINGS as $k) $s[$k] = $s[$k] !== '' ? '••••••••' : '';
        json_out(['settings' => $s, 'last_run' => row("SELECT value FROM settings WHERE name = 'inbox_last_run'")['value'] ?? null]);
        return;
    }
    if ($method === 'POST' && $sub === '/inbox/test') {
        $user = setting('imap_user') ?: setting('inbox_address');
        $imap = new Imap(setting('imap_host') ?: 'imap.hostinger.com', (int)(setting('imap_port') ?: 993), $user, setting('imap_pass'));
        $imap->select('INBOX');
        $n = count($imap->unseen());
        $imap->close();
        json_out(['ok' => true, 'message' => "Connected to $user. $n unread email" . ($n === 1 ? '' : 's') . ' waiting.']);
        return;
    }
    if ($method === 'POST' && $sub === '/inbox/run') {
        json_out(ingest_run());
        return;
    }
    if ($method === 'GET' && $sub === '/inbox') {
        $st = $_GET['status'] ?? '';
        json_out(['items' => $st ? rows('SELECT * FROM inbox WHERE status = ? ORDER BY id DESC LIMIT 200', [$st]) : rows('SELECT * FROM inbox ORDER BY id DESC LIMIT 200')]);
        return;
    }
    if ($method === 'POST' && ($seg[1] ?? '') === 'inbox' && isset($seg[2], $seg[3]) && in_array($seg[3], ['approve', 'reject'], true)) {
        $it = row('SELECT * FROM inbox WHERE id = ?', [(int)$seg[2]]);
        if (!$it) throw new ApiError(404, 'Not found.');
        json_out(inbox_apply($it, $seg[3] === 'approve'));
        return;
    }
    if ($method === 'GET' && $sub === '/verses/upcoming') {
        $days = max(7, min(62, (int)($_GET['days'] ?? 35)));
        $out = [];
        for ($i = 0; $i < $days; $i++) {
            $d = date('Y-m-d', strtotime("+$i days"));
            $out[] = verse_for($d, 'day');
        }
        $weeks = [];
        for ($i = 0; $i < 6; $i++) $weeks[] = verse_for(date('Y-m-d', strtotime("+$i weeks")), 'week');
        json_out(['days' => $out, 'weeks' => $weeks, 'bible' => bible_ready(), 'channel' => setting('whatsapp_channel')]);
        return;
    }
    if ($method === 'POST' && $sub === '/bible/import') {
        @set_time_limit(300);
        json_out(['ok' => true, 'loaded' => bible_import()]);
        return;
    }
    if ($method === 'GET' && $sub === '/letters') {
        json_out(letters_admin_list());
        return;
    }
    if (($seg[1] ?? '') === 'letters' && isset($seg[2], $seg[3])) {
        if ($method === 'GET' && $seg[3] === 'preview') {
            $l = row('SELECT * FROM letters WHERE id = ?', [(int)$seg[2]]);
            if (!$l) throw new ApiError(404, 'Not found.');
            header('Content-Type: text/html; charset=utf-8');
            header("Content-Security-Policy: default-src 'none'; img-src * data:; style-src 'unsafe-inline'");
            echo letter_render($l, ['name' => $admin['name'] ?? '', 'token' => 'preview', 'email' => $admin['email']])[2];
            return;
        }
        if ($method === 'POST') {
            json_out(letter_action((int)$seg[2], $seg[3], $admin));
            return;
        }
    }
    if ($method === 'POST' && $sub === '/sms/send') {
        $b = body();
        $phones = array_filter(array_map('sms_phone', preg_split('/[,;\n]+/', (string)($b['phones'] ?? ''))));
        if (!$phones) throw new ApiError(422, 'Add at least one phone number.');
        $text = trim((string)($b['text'] ?? '')) ?: sms_verse_text(verse_for(date('Y-m-d'), 'day'));
        $n = sms_send(array_slice($phones, 0, 50), mb_substr($text, 0, 459));
        log_change('settings', 'sms', null, null, null, "Sent an SMS to $n number" . ($n === 1 ? '' : 's'));
        json_out(['ok' => true, 'sent' => $n]);
        return;
    }
    if ($method === 'GET' && ($sub === '/sms_contacts.csv' || $sub === '/subscribers.csv')) {
        $kind = $sub === '/sms_contacts.csv' ? 'phones' : 'emails';
        header('Content-Type: text/csv; charset=utf-8');
        header('Cache-Control: no-store');
        header('Content-Disposition: attachment; filename="phomi-' . ($kind === 'phones' ? 'phone' : 'email') . '-list.csv"');
        echo lists_csv($kind);
        return;
    }
    if ($method === 'GET' && $sub === '/lists') {
        json_out(['counts' => lists_counts(), 'to' => lists_email_to(), 'private' => trim(setting('lists_email')) !== '', 'weekly' => setting('lists_weekly') === '1', 'sent_on' => setting('lists_sent_on')]);
        return;
    }
    if ($method === 'POST' && $sub === '/lists/send') {
        rate_limit('lists-send:' . client_ip(), 5, 60);
        $r = lists_send('now');
        log_change('settings', 'lists', null, null, null, 'Emailed the email and phone lists to the private address');
        json_out($r);
        return;
    }
    if ($method === 'GET' && $sub === '/changes') {
        json_out(['items' => history_list((int)($_GET['limit'] ?? 200))]);
        return;
    }
    if ($method === 'POST' && ($seg[1] ?? '') === 'changes' && isset($seg[2]) && ($seg[3] ?? '') === 'undo') {
        json_out(history_undo((int)$seg[2]));
        return;
    }
    if ($method === 'GET' && $sub === '/gifts') {
        json_out(gifts_report());
        return;
    }
    if ($method === 'GET' && $sub === '/gifts.csv') {
        gifts_csv();
        return;
    }
    if ($method === 'GET' && $sub === '/messages') {
        $kind = in_array($_GET['kind'] ?? '', ['prayer', 'contact'], true) ? $_GET['kind'] : null;
        json_out(['items' => $kind ? rows('SELECT * FROM messages WHERE kind = ? ORDER BY id DESC LIMIT 300', [$kind]) : rows('SELECT * FROM messages ORDER BY id DESC LIMIT 300')]);
        return;
    }
    if ($method === 'POST' && ($seg[1] ?? '') === 'messages' && isset($seg[2])) {
        if (($seg[3] ?? '') === 'delete') q('DELETE FROM messages WHERE id = ?', [(int)$seg[2]]);
        else q('UPDATE messages SET handled = ? WHERE id = ?', [!empty(body()['handled']) ? 1 : 0, (int)$seg[2]]);
        json_out(['ok' => true]);
        return;
    }
    if ($sub === '/admins') {
        if ($method === 'POST') {
            $b = body();
            $email = strtolower(str_in($b, 'email', 190));
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new ApiError(422, 'Enter a valid email.');
            check_password((string)($b['password'] ?? ''));
            if (row('SELECT id FROM admins WHERE email = ?', [$email])) throw new ApiError(409, 'That person already has an account.');
            insert('admins', ['email' => $email, 'name' => str_in($b, 'name', 120), 'password_hash' => password_hash((string)$b['password'], PASSWORD_DEFAULT), 'created_at' => now()]);
        }
        json_out(['items' => rows('SELECT id, email, name, created_at, last_login FROM admins ORDER BY id')]);
        return;
    }
    if ($method === 'POST' && ($seg[1] ?? '') === 'admins' && isset($seg[2]) && ($seg[3] ?? '') === 'delete') {
        if ((int)$seg[2] === (int)$admin['id']) throw new ApiError(422, 'You cannot remove your own account.');
        q('DELETE FROM admins WHERE id = ?', [(int)$seg[2]]);
        json_out(['ok' => true]);
        return;
    }
    if ($method === 'POST' && $sub === '/password') {
        $b = body();
        $me = row('SELECT * FROM admins WHERE id = ?', [$admin['id']]);
        if (!password_verify((string)($b['current'] ?? ''), $me['password_hash'])) throw new ApiError(422, 'Your current password is not right.');
        check_password((string)($b['password'] ?? ''));
        q('UPDATE admins SET password_hash = ? WHERE id = ?', [password_hash((string)$b['password'], PASSWORD_DEFAULT), $admin['id']]);
        json_out(['ok' => true]);
        return;
    }
    throw new ApiError(404, 'Not found.');
}

function save_message(string $kind, array $b): array
{
    if (!empty($b['website'])) return ['ok' => true]; // hidden field that only bots fill in
    rate_limit("msg:" . client_ip(), 6, 30);
    $body = str_in($b, $kind === 'prayer' ? 'request' : 'message', 5000);
    if ($body === '') throw new ApiError(422, $kind === 'prayer' ? 'Please write your prayer request.' : 'Please write a message.');
    $name = $kind === 'prayer' ? str_in($b, 'name', 120) : trim(str_in($b, 'first', 60) . ' ' . str_in($b, 'last', 60));
    $contact = $kind === 'prayer' ? str_in($b, 'contact', 190) : trim(str_in($b, 'phone', 40) . ' ' . str_in($b, 'email', 150));
    $row = [
        'kind' => $kind, 'name' => $name, 'contact' => $contact, 'topic' => str_in($b, 'topic', 60),
        'body' => $body, 'private' => !empty($b['private']) ? 1 : 0, 'handled' => 0, 'created_at' => now(),
    ];
    insert('messages', $row);
    notify_admins(
        ($kind === 'prayer' ? 'Prayer request' . ($row['private'] ? ' (private)' : '') : 'Website message') . ' from ' . ($name ?: 'Anonymous'),
        "From: " . ($name ?: 'Anonymous') . "\nContact: " . ($contact ?: '(none)') . ($row['topic'] ? "\nTopic: {$row['topic']}" : '') . "\n\n$body\n\nSee all messages: " . site_url('/admin#messages') . "\n"
    );
    return ['ok' => true];
}

function admin_stats(): array
{
    $c = fn(string $sql, array $a = []) => (int)(row($sql, $a)['n'] ?? 0);
    $month = date('Y-m-01 00:00:00');
    return [
        'review' => $c("SELECT COUNT(*) AS n FROM inbox WHERE status = 'review'"),
        'subscribers' => $c("SELECT COUNT(*) AS n FROM subscribers WHERE status = 'active'"),
        'letters_on' => setting('letters_on') === '1',
        'bible' => bible_ready(),
        'sermons' => $c("SELECT COUNT(*) AS n FROM sermons WHERE status = 'live'"),
        'photos' => $c("SELECT COUNT(*) AS n FROM photos WHERE status = 'live'"),
        'events' => $c("SELECT COUNT(*) AS n FROM events WHERE status = 'live' AND starts_at >= ?", [date('Y-m-d 00:00:00')]),
        'messages' => $c("SELECT COUNT(*) AS n FROM messages WHERE handled = 0"),
        'gifts_month' => (int)(row("SELECT COALESCE(SUM(amount),0) AS n FROM gifts WHERE status = 'successful' AND created_at >= ?", [$month])['n'] ?? 0),
        'gifts_count' => $c("SELECT COUNT(*) AS n FROM gifts WHERE status = 'successful' AND created_at >= ?", [$month]),
        'payments' => payment_provider() ?: 'off',
        'inbox_ready' => setting('imap_pass') !== '' && (setting('imap_user') ?: setting('inbox_address')) !== '',
        'last_run' => row("SELECT value FROM settings WHERE name = 'inbox_last_run'")['value'] ?? null,
    ];
}

function gifts_report(): array
{
    $from = preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['from'] ?? '') ? $_GET['from'] : date('Y-m-01');
    $to = preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['to'] ?? '') ? $_GET['to'] : date('Y-m-d');
    $args = ["$from 00:00:00", "$to 23:59:59"];
    $items = rows('SELECT * FROM gifts WHERE created_at BETWEEN ? AND ? ORDER BY id DESC LIMIT 1000', $args);
    $byFund = rows("SELECT fund, COUNT(*) AS count, SUM(amount) AS total FROM gifts WHERE status = 'successful' AND created_at BETWEEN ? AND ? GROUP BY fund", $args);
    return ['from' => $from, 'to' => $to, 'items' => $items, 'by_fund' => $byFund, 'funds' => FUNDS];
}

function gifts_csv(): void
{
    $r = gifts_report();
    header('Content-Type: text/csv; charset=utf-8');
    header("Content-Disposition: attachment; filename=phomi-gifts-{$r['from']}-to-{$r['to']}.csv");
    $out = fopen('php://output', 'w');
    fputcsv($out, ['Date', 'Reference', 'Fund', 'Amount (UGX)', 'Network', 'Phone', 'Name', 'Status', 'Provider reference']);
    foreach ($r['items'] as $g) {
        fputcsv($out, [$g['created_at'], $g['ref'], FUNDS[$g['fund']] ?? $g['fund'], $g['amount'], $g['network'], $g['phone'], $g['name'], $g['status'], $g['provider_ref']]);
    }
    fclose($out);
}

// The one-tap approval link in the email opens this small page. The change only happens when the button is pressed,
// so email link-scanners that open links automatically can't approve anything.
function approve_page(string $method): void
{
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'");
    $t = preg_replace('/[^a-f0-9]/', '', (string)($_GET['t'] ?? $_POST['t'] ?? ''));
    $msg = '';
    $it = null;
    try {
        if ($method === 'POST') {
            actor('approval link');
            $r = inbox_decide($t, ($_POST['do'] ?? '') === 'approve');
            $msg = $r['status'] === 'published' ? 'Approved. It is now on the website.' : 'Rejected. It will not appear on the website.';
        } else {
            $it = $t ? row("SELECT * FROM inbox WHERE approve_token = ? AND status = 'review'", [$t]) : null;
            if (!$it) $msg = 'This update has already been handled, or the link is wrong.';
        }
    } catch (ApiError $e) {
        $msg = $e->getMessage();
    }
    $h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Approve update</title>';
    echo '<body style="font-family:system-ui,sans-serif;background:#F4EDE1;color:#1B2A47;margin:0;padding:32px 16px"><main style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:24px">';
    echo "<h1 style=\"font-size:22px;margin:0 0 12px\">Potter's House website</h1>";
    if ($it) {
        echo '<p>' . $h($it['from_name'] ?: $it['from_email']) . ' sent a <b>' . $h($it['target_type']) . '</b>:</p><p style="font-size:18px"><b>' . $h($it['subject']) . '</b></p>';
        if ($it['note']) echo '<p style="color:#6b5e4f;white-space:pre-line">' . $h($it['note']) . '</p>';
        echo '<form method="post" style="display:flex;gap:12px;margin-top:20px"><input type="hidden" name="t" value="' . $h($t) . '">';
        echo '<button name="do" value="approve" style="flex:1;padding:14px;border:0;border-radius:8px;background:#A03207;color:#fff;font-size:16px">Approve</button>';
        echo '<button name="do" value="reject" style="flex:1;padding:14px;border:1px solid #1B2A47;border-radius:8px;background:#fff;color:#1B2A47;font-size:16px">Reject</button></form>';
        echo '<p style="margin-top:20px"><a href="/admin#inbox">Open the admin page to edit it first</a></p>';
    } else {
        echo '<p style="font-size:18px">' . $h($msg) . '</p><p><a href="/admin#inbox">Open the admin page</a></p>';
    }
    echo '</main></body>';
}
