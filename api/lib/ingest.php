<?php
declare(strict_types=1);

// Automatic updates by email.
// Approved people email the church update address with a tag at the start of the subject:
//   Sermon: Faith that moves mountains
//   Photo: Outreach, Kibuku visit        (category first, then a caption)
//   Event: Youth crusade
//   Announcement: No evening prayer this Friday
//   Times: Prayer moves to Wednesday
//   Testimony: Healed after prayer
// Untagged mail is read by Claude, which decides where it belongs (or holds it for review).

const TAGS = [
    'sermon' => 'sermon', 'sermons' => 'sermon', 'message' => 'sermon', 'preaching' => 'sermon',
    'photo' => 'photo', 'photos' => 'photo', 'picture' => 'photo', 'pictures' => 'photo', 'gallery' => 'photo', 'pics' => 'photo',
    'event' => 'event', 'events' => 'event',
    'announcement' => 'announcement', 'news' => 'announcement', 'notice' => 'announcement',
    'times' => 'times', 'time' => 'times', 'schedule' => 'times',
    'testimony' => 'testimony', 'testimonies' => 'testimony',
];

const KIND_TABLE = ['sermon' => 'sermons', 'photo' => 'photos', 'event' => 'events', 'announcement' => 'announcements', 'testimony' => 'testimonies', 'times' => 'settings'];
const KIND_PAGE = ['sermon' => '/sermons', 'photo' => '/gallery', 'event' => '/events', 'announcement' => '/', 'testimony' => '/', 'times' => '/events'];
const MAX_PER_SENDER_PER_DAY = 40;

// Reads new mail. Called by the cron job every 5 minutes.
function ingest_run(int $max = 25): array
{
    $user = setting('imap_user') ?: setting('inbox_address');
    $pass = setting('imap_pass');
    if ($user === '' || $pass === '') return ['ok' => false, 'message' => 'The update mailbox is not set up yet (Admin → Settings).'];

    $imap = new Imap(setting('imap_host') ?: 'imap.hostinger.com', (int)(setting('imap_port') ?: 993), $user, $pass);
    $imap->select('INBOX');
    $done = [];
    foreach (array_slice($imap->unseen(), 0, $max) as $uid) {
        $raw = $imap->fetch($uid);
        try {
            $done[] = ingest_message($raw);
        } catch (Throwable $e) {
            error_log('PHOMI inbox: ' . $e->getMessage());
            $done[] = ['status' => 'error', 'note' => $e->getMessage()];
        }
        $imap->markSeen($uid); // never read the same email twice, even if it failed
    }
    $imap->close();
    setting_set_raw('inbox_last_run', now());
    return ['ok' => true, 'processed' => count($done), 'items' => $done];
}

function setting_set_raw(string $name, string $value): void
{
    if (row('SELECT id FROM settings WHERE name = ?', [$name])) q('UPDATE settings SET value = ? WHERE name = ?', [$value, $name]);
    else insert('settings', ['name' => $name, 'value' => $value]);
}

function ingest_message(string $raw): array
{
    $m = mime_parse($raw);
    $from = $m['from_email'];
    $log = [
        'message_id' => mb_substr($m['message_id'], 0, 250), 'from_email' => mb_substr($from, 0, 190),
        'from_name' => mb_substr($m['from_name'], 0, 190), 'subject' => mb_substr($m['subject'], 0, 300),
        'received_at' => now(), 'status' => 'pending', 'note' => '', 'tag' => '', 'target_type' => '', 'target_ids' => '',
        'approve_token' => '', 'payload' => null,
    ];
    if (row('SELECT id FROM inbox WHERE message_id = ?', [$log['message_id']])) return ['status' => 'duplicate'];

    // Ignore our own replies, auto-replies and bounces so mail can never loop
    $auto = strtolower($m['headers']['auto-submitted'] ?? 'no');
    if (isset($m['headers']['x-phomi-mailer']) || $auto !== 'no' || $from === strtolower((string)config('mail_from'))
        || preg_match('/^(mailer-daemon|postmaster|no-?reply)@/i', $from)) {
        return ingest_log($log, 'ignored', 'Automatic message');
    }

    $sender = row('SELECT * FROM senders WHERE email = ?', [$from]);
    if (!$sender) {
        // Unknown senders get no reply (avoids spam backscatter). The admin sees them in the inbox log.
        return ingest_log($log, 'rejected', 'Sender is not on the approved list');
    }
    $today = date('Y-m-d 00:00:00');
    $count = (int)(row("SELECT COUNT(*) AS n FROM inbox WHERE from_email = ? AND received_at >= ?", [$from, $today])['n'] ?? 0);
    if ($count >= MAX_PER_SENDER_PER_DAY) return ingest_log($log, 'rejected', 'Daily limit reached');

    [$tagKind, $rest] = parse_tag($m['subject']);
    $log['tag'] = $tagKind ?? '';
    $text = strip_reply($m['text']);
    [$fields, $body] = parse_field_lines($text);

    // Save attachments first (photos are resized and lightly sharpened)
    $media = ['image' => [], 'audio' => [], 'video' => [], 'document' => []];
    $notes = [];
    foreach ($m['attachments'] as $att) {
        if (strlen($att['bytes']) < 8000 && str_starts_with($att['mime'], 'image/')) continue; // logos and signature icons
        try {
            $saved = store_media($att['bytes'], $att['filename'], $att['mime']);
            $media[$saved['kind']][] = $saved;
        } catch (ApiError $e) {
            $notes[] = "{$att['filename']}: {$e->getMessage()}";
        }
    }

    // Claude reads the email: decides the kind if untagged, and writes tidy titles and captions
    $ai = null;
    if (setting('ai_enabled') === '1') {
        $thumbs = [];
        foreach (array_slice($media['image'], 0, 4) as $img) {
            $path = rtrim((string)config('uploads_dir'), '/') . substr($img['thumb'], strlen(rtrim((string)config('uploads_url'), '/')));
            if (is_file($path)) $thumbs[] = file_get_contents($path);
        }
        $ai = ai_read_email($m['subject'], $text, array_map(fn($a) => ['filename' => $a['filename'], 'mime' => $a['mime']], $m['attachments']), $thumbs, $tagKind ?? '');
    }

    $kind = $tagKind;
    $sure = true;
    if (!$kind) {
        if ($ai && $ai['kind'] !== 'other') {
            $kind = $ai['kind'];
            $sure = (bool)$ai['confident'];
        } elseif (!$ai && $media['image'] && trim($body) === '') {
            $kind = 'photo'; // photos with no words: put them in the gallery
            $sure = false;
        } else {
            return ingest_log($log, $ai ? 'ignored' : 'review', $ai ? ('Not a website update: ' . $ai['reason']) : 'No tag, and Claude is not switched on. Add a tag such as "Sermon:" to the subject.');
        }
    }
    if ($ai && $tagKind && $ai['kind'] !== $tagKind && $ai['kind'] !== 'other') $sure = $sure && (bool)$ai['confident'];

    $live = $sure && (setting('publish_mode') === 'auto' || (int)$sender['publish_direct'] === 1);
    if ($kind === 'testimony') $live = (int)$sender['publish_direct'] === 1 && $sure;
    $status = $live ? 'live' : 'review';

    $built = build_items($kind, $rest, $fields, $body, $media, $ai ?? [], $m['from_name']);
    if (!$built['items'] && $kind !== 'times') {
        return ingest_log(array_merge($log, ['target_type' => $kind]), 'review', $built['problem'] ?: 'Nothing to publish was found in the email.');
    }
    if ($built['problem']) {
        $status = 'review';
        $notes[] = $built['problem'];
    }

    $ids = [];
    if ($kind === 'times') {
        $log['payload'] = json_encode($built['times']);
        if ($status === 'live') apply_times($built['times']);
    } else {
        $table = KIND_TABLE[$kind];
        foreach ($built['items'] as $item) {
            $item['status'] = $status;
            $ids[] = resource_create($table, $item, 'email')['id'];
        }
    }

    $log['target_type'] = $kind;
    $log['target_ids'] = implode(',', $ids);
    $log['approve_token'] = $status === 'review' ? random_token(20) : '';
    $res = ingest_log($log, $status === 'live' ? 'published' : 'review', implode("\n", array_filter([$ai ? ('Claude: ' . $ai['reason']) : '', ...$notes])));

    ingest_reply($from, $m['subject'], $kind, $status, $built['label'], $notes);
    if ($status === 'review') ingest_ask_approval($log, $kind, $built['label']);
    return $res;
}

function ingest_log(array $log, string $status, string $note): array
{
    $log['status'] = $status;
    $log['note'] = $note;
    insert('inbox', $log);
    return ['status' => $status, 'kind' => $log['target_type'], 'note' => $note];
}

// "Photo: Outreach, Kibuku visit" → ['photo', 'Outreach, Kibuku visit']. Also accepts "[Sermon]" and "Fwd: Sermon -".
function parse_tag(string $subject): array
{
    $s = preg_replace('/^\s*((re|fwd?|fw)\s*:\s*)+/i', '', $subject);
    if (preg_match('/^\s*\[?\s*([a-z]+)\s*(?:\]|:|-|–)\s*(.*)$/iu', $s, $mm)) {
        $k = strtolower($mm[1]);
        if (isset(TAGS[$k])) return [TAGS[$k], trim($mm[2])];
    }
    return [null, trim($s)];
}

// Pulls "Preacher: ...", "Date: ...", "Venue: ..." lines out of the body.
function parse_field_lines(string $text): array
{
    $keys = [
        'preacher' => 'preacher', 'speaker' => 'preacher', 'minister' => 'preacher', 'pastor' => 'preacher',
        'scripture' => 'scripture', 'text' => 'scripture', 'reading' => 'scripture', 'bible' => 'scripture',
        'date' => 'date', 'day' => 'date', 'time' => 'time', 'venue' => 'venue', 'place' => 'venue', 'where' => 'venue',
        'until' => 'until', 'ends' => 'until', 'end' => 'until', 'category' => 'category', 'link' => 'link', 'youtube' => 'link',
        'type' => 'kind', 'kind' => 'kind', 'title' => 'title', 'caption' => 'caption',
        'sunday' => 'sunday', 'prayer day' => 'prayer_day', 'prayer time' => 'prayer_time', 'prayer' => 'prayer',
        'bible study day' => 'bible_day', 'bible study time' => 'bible_time', 'bible study' => 'bible',
    ];
    $fields = [];
    $rest = [];
    foreach (explode("\n", $text) as $line) {
        if (preg_match('/^\s*([a-z ]{3,16})\s*:\s*(.+)$/i', $line, $mm)) {
            $k = strtolower(trim($mm[1]));
            if (isset($keys[$k]) && !isset($fields[$keys[$k]])) {
                $fields[$keys[$k]] = trim($mm[2]);
                continue;
            }
        }
        $rest[] = $line;
    }
    return [$fields, trim(implode("\n", $rest))];
}

function parse_date(string $v): ?string
{
    if ($v === '') return null;
    $t = strtotime(str_replace(['th ', 'st ', 'nd ', 'rd '], ' ', $v));
    return $t ? date('Y-m-d', $t) : null;
}

function first_link(string $text): string
{
    return preg_match('#https?://(?:www\.|m\.)?(?:youtube\.com|youtu\.be|facebook\.com|fb\.watch)/\S+#i', $text, $mm) ? rtrim($mm[0], '.,)') : '';
}

function pick(array $ai, string $key, string $fallback): string
{
    $v = trim((string)($ai[$key] ?? ''));
    return $v !== '' ? $v : $fallback;
}

function build_items(string $kind, string $rest, array $f, string $body, array $media, array $ai, string $fromName): array
{
    $items = [];
    $problem = '';
    $label = '';
    $times = [];
    $firstImg = $media['image'][0]['url'] ?? '';

    switch ($kind) {
        case 'sermon':
            $title = pick($ai, 'title', $f['title'] ?? $rest);
            $item = [
                'title' => $title ?: 'Sunday sermon',
                'preacher' => pick($ai, 'preacher', $f['preacher'] ?? ''),
                'scripture' => pick($ai, 'scripture', $f['scripture'] ?? ''),
                'preached_on' => parse_date(pick($ai, 'date', $f['date'] ?? '')) ?? date('Y-m-d'),
                'summary' => pick($ai, 'summary', $body),
                'media_url' => $f['link'] ?? first_link($body),
                'audio' => $media['audio'][0]['url'] ?? '',
                'video' => $media['video'][0]['url'] ?? '',
                'cover' => $firstImg,
            ];
            if ($title === '') $problem = 'The sermon had no title; it was called "Sunday sermon".';
            $items[] = $item;
            $label = $item['title'];
            break;

        case 'photo':
            [$cat, $caption] = split_category($rest, $f['category'] ?? '');
            $cat = $cat ?: (in_array($ai['category'] ?? '', gallery_categories(), true) ? $ai['category'] : 'Fellowship');
            foreach ($media['image'] as $i => $img) {
                $items[] = [
                    'file' => $img['url'],
                    'caption' => trim((string)($ai['captions'][$i] ?? '')) ?: ($f['caption'] ?? $caption),
                    'category' => $cat,
                    'taken_on' => parse_date($f['date'] ?? '') ?? date('Y-m-d'),
                ];
            }
            if (!$items) $problem = 'No photos were attached (iPhone HEIC photos must be sent as JPG).';
            $label = count($items) . ' photo' . (count($items) === 1 ? '' : 's') . " in $cat";
            break;

        case 'event':
            $date = parse_date(pick($ai, 'date', $f['date'] ?? ''));
            $time = pick($ai, 'time', $f['time'] ?? '');
            $t = $time !== '' ? strtotime($time) : false;
            $title = pick($ai, 'title', $f['title'] ?? $rest);
            $items[] = [
                'title' => $title ?: 'Church event',
                'kind' => pick($ai, 'event_kind', $f['kind'] ?? ''),
                'starts_at' => ($date ?? date('Y-m-d', strtotime('+7 days'))) . ' ' . ($t ? date('H:i:00', $t) : '09:00:00'),
                'venue' => pick($ai, 'venue', $f['venue'] ?? 'PHOMI, Burweta'),
                'details' => pick($ai, 'summary', $body),
                'cover' => $firstImg,
            ];
            if (!$date) $problem = 'No date was found for the event. Check it before it goes live.';
            $label = $items[0]['title'];
            break;

        case 'announcement':
            $title = pick($ai, 'title', $f['title'] ?? $rest);
            $items[] = [
                'title' => $title ?: mb_substr($body, 0, 80),
                'body' => pick($ai, 'summary', $body),
                'link' => $f['link'] ?? '',
                'starts_on' => date('Y-m-d'),
                'ends_on' => parse_date($f['until'] ?? '') ?? date('Y-m-d', strtotime('+14 days')),
            ];
            $label = $items[0]['title'];
            break;

        case 'testimony':
            $items[] = [
                'name' => $fromName,
                'title' => pick($ai, 'title', $rest),
                'body' => pick($ai, 'summary', $body),
            ];
            $label = $items[0]['title'] ?: 'Testimony';
            break;

        case 'times':
            $at = $ai['times'] ?? [];
            $map = ['sunday' => 'times_sunday', 'prayer_day' => 'times_prayer_day', 'prayer_time' => 'times_prayer_time', 'bible_day' => 'times_bible_day', 'bible_time' => 'times_bible_time'];
            foreach ($map as $k => $setting) {
                $v = trim((string)($at[$k] ?? $f[$k] ?? ''));
                if ($v !== '') $times[$setting] = mb_substr($v, 0, 80);
            }
            if (!$times) $problem = 'No new times were found. Write lines like "Prayer day: Wednesday" and "Prayer time: 6:30pm – 8:30pm".';
            $label = 'service times';
            break;
    }
    return ['items' => $items, 'times' => $times, 'problem' => $problem, 'label' => $label];
}

function split_category(string $rest, string $explicit): array
{
    foreach (gallery_categories() as $c) {
        if (strcasecmp(trim($explicit), $c) === 0) return [$c, $rest];
        if (preg_match('/^' . preg_quote($c, '/') . '\b\s*[,:\-–]?\s*(.*)$/i', $rest, $mm)) return [$c, trim($mm[1])];
    }
    return ['', $rest];
}

function apply_times(array $times): void
{
    foreach ($times as $k => $v) setting_set($k, (string)$v);
}

function ingest_reply(string $to, string $subject, string $kind, string $status, string $label, array $notes): void
{
    $page = site_url(KIND_PAGE[$kind] ?? '/');
    $what = ['sermon' => 'sermon', 'photo' => 'photos', 'event' => 'event', 'announcement' => 'announcement', 'testimony' => 'testimony', 'times' => 'new service times'][$kind] ?? 'update';
    $text = $status === 'live'
        ? "Thank you. Your $what ($label) is now on the website:\n$page\n"
        : "Thank you. Your $what ($label) has been received and is waiting for approval. You will see it on the website once it is approved.\n";
    if ($notes) $text .= "\nPlease note:\n- " . implode("\n- ", $notes) . "\n";
    $text .= "\nTo make changes, sign in at " . site_url('/admin') . " or reply to the church office.\n\nPotter's House website";
    send_mail($to, 'Re: ' . $subject, $text);
}

function ingest_ask_approval(array $log, string $kind, string $label): void
{
    $link = site_url('/api/inbox/approve?t=' . $log['approve_token']);
    notify_admins(
        "Approve website update: $label",
        "{$log['from_name']} <{$log['from_email']}> sent a $kind for the website:\n\n\"{$log['subject']}\"\n\n" .
        "Approve or reject it here (one tap):\n$link\n\nOr review it in the admin page: " . site_url('/admin#inbox') . "\n"
    );
}

function inbox_decide(string $token, bool $approve): array
{
    $it = $token !== '' ? row("SELECT * FROM inbox WHERE approve_token = ? AND status = 'review'", [$token]) : null;
    if (!$it) throw new ApiError(404, 'This update has already been handled, or the link is wrong.');
    return inbox_apply($it, $approve);
}

function inbox_apply(array $it, bool $approve): array
{
    $type = $it['target_type'];
    if ($type === 'times') {
        if ($approve && $it['payload']) apply_times(json_decode($it['payload'], true) ?: []);
    } elseif (isset(KIND_TABLE[$type])) {
        $table = KIND_TABLE[$type];
        foreach (array_filter(explode(',', (string)$it['target_ids'])) as $id) {
            q("UPDATE $table SET status = ? WHERE id = ?", [$approve ? 'live' : 'hidden', (int)$id]);
        }
    }
    q('UPDATE inbox SET status = ?, approve_token = ? WHERE id = ?', [$approve ? 'published' : 'rejected', '', $it['id']]);
    if ($approve && $it['from_email']) {
        send_mail($it['from_email'], 'Re: ' . $it['subject'], "Good news: your update is now on the website.\n" . site_url(KIND_PAGE[$type] ?? '/') . "\n\nPotter's House website");
    }
    return ['status' => $approve ? 'published' : 'rejected', 'page' => KIND_PAGE[$type] ?? '/'];
}
