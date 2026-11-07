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
//   Video: Sunday choir (with YouTube or TikTok links in the email, or an MP4 attached)
// Nothing goes live by itself: every emailed update waits for an admin to approve it.
// Untagged mail is sorted by simple keyword rules (no AI).

const TAGS = [
    'sermon' => 'sermon', 'sermons' => 'sermon', 'message' => 'sermon', 'preaching' => 'sermon',
    'photo' => 'photo', 'photos' => 'photo', 'picture' => 'photo', 'pictures' => 'photo', 'gallery' => 'photo', 'pics' => 'photo',
    'event' => 'event', 'events' => 'event',
    'announcement' => 'announcement', 'news' => 'announcement', 'notice' => 'announcement',
    'times' => 'times', 'time' => 'times', 'schedule' => 'times',
    'testimony' => 'testimony', 'testimonies' => 'testimony',
    'video' => 'video', 'videos' => 'video', 'clip' => 'video', 'clips' => 'video', 'youtube' => 'video', 'tiktok' => 'video',
];

const KIND_TABLE = ['sermon' => 'sermons', 'photo' => 'photos', 'event' => 'events', 'announcement' => 'announcements', 'testimony' => 'testimonies', 'video' => 'videos', 'times' => 'settings'];
const KIND_PAGE = ['sermon' => '/sermons', 'photo' => '/gallery', 'event' => '/events', 'announcement' => '/', 'testimony' => '/', 'video' => '/sermons', 'times' => '/events'];
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
    setting_store('inbox_last_run', now());
    return ['ok' => true, 'processed' => count($done), 'items' => $done];
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
    actor('email: ' . $from);
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

    // The tag decides where it goes. Without a tag, simple rules make a best guess and the item waits for approval.
    $kind = $tagKind;
    $sure = true;
    if (!$kind) {
        $kind = guess_kind($m['subject'] . "\n" . $body, $fields, $media);
        $sure = false;
        if (!$kind) {
            $log['note'] = 'No tag in the subject, and the email did not look like a sermon, photos, an event or an announcement.';
            send_mail($from, 'Re: ' . $m['subject'], "Thank you for your email. It was not added to the website because the subject did not start with a tag.\n\n"
                . "Please send it again with one of these at the start of the subject:\n  Sermon:\n  Photo: (then a category, e.g. Photo: Outreach)\n  Event:\n  Announcement:\n  Times:\n  Testimony:\n\nPotter's House website");
            return ingest_log($log, 'ignored', $log['note']);
        }
        $notes[] = "No tag in the subject, so this was treated as: $kind. Please check before approving.";
    }

    $status = 'review'; // an admin always approves before anything appears on the site

    $built = build_items($kind, $rest, $fields, $body, $media, $m['from_name']);
    if (!$built['items'] && $kind !== 'times') {
        return ingest_log(array_merge($log, ['target_type' => $kind]), 'review', $built['problem'] ?: 'Nothing to publish was found in the email.');
    }
    if ($built['problem']) $notes[] = $built['problem'];

    $ids = [];
    if ($kind === 'times') {
        $log['payload'] = json_encode($built['times']);
    } else {
        $table = KIND_TABLE[$kind];
        foreach ($built['items'] as $item) {
            $item['status'] = $status;
            $ids[] = resource_create($table, $item, 'email')['id'];
        }
    }

    $log['target_type'] = $kind;
    $log['target_ids'] = implode(',', $ids);
    $log['approve_token'] = random_token(20);
    $res = ingest_log($log, 'review', implode("\n", $notes));

    ingest_reply($from, $m['subject'], $kind, $status, $built['label'], $notes);
    ingest_ask_approval($log, $kind, $built['label']);
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

const VIDEO_LINK_RE = '#https?://(?:www\.|m\.|vm\.|vt\.)?(?:youtube\.com|youtu\.be|tiktok\.com|facebook\.com|fb\.watch)/[^\s<>"\']+#i';

function first_link(string $text): string
{
    return video_links($text)[0] ?? '';
}

function video_links(string $text): array
{
    preg_match_all(VIDEO_LINK_RE, $text, $mm);
    return array_values(array_unique(array_map(fn($l) => rtrim($l, '.,)'), $mm[0])));
}

// Best guess for an email without a tag. Plain rules, no AI: the result always waits for approval.
function guess_kind(string $text, array $f, array $media): ?string
{
    $t = strtolower($text);
    $has = fn(string $re) => (bool)preg_match($re, $t);
    if ($has('/\btestimon(y|ies)\b/')) return 'testimony';
    if ($media['audio'] || isset($f['preacher']) || isset($f['scripture']) || $has('/\b(sermon|preached|preaching|preacher)\b/')) return 'sermon';
    if ($media['video'] || first_link($text) !== '') return 'video';
    if (isset($f['prayer_day']) || isset($f['prayer_time']) || isset($f['sunday']) || isset($f['bible_day']) || isset($f['bible_time'])
        || $has('/\b(service|prayer|bible study) (time|times|day) (is |are |has |have )?(changed|moves?|now)\b/')) return 'times';
    if (isset($f['date']) || isset($f['venue']) || $has('/\b(crusade|conference|seminar|convention|retreat|youth day|overnight|kesha|outreach on|join us on)\b/')) return 'event';
    if ($media['image']) return 'photo';
    if ($has('/\b(announcement|notice|cancelled|canceled|postponed|reminder|please note)\b/')) return 'announcement';
    return null;
}

// Turns a meaningful file name (e.g. "baptism-at-the-river.jpg") into a caption; camera names like IMG_1234 give none.
function caption_from_file(string $url): string
{
    $n = pathinfo($url, PATHINFO_FILENAME);
    $n = preg_replace('/-[a-f0-9]{6}$/', '', $n);
    if (preg_match('/^(img|dsc|image|photo|pxl|whatsapp)[-_ ]?\d*/i', $n) || preg_match('/^[\d-]+$/', $n)) return '';
    return ucfirst(trim(str_replace('-', ' ', $n)));
}

function build_items(string $kind, string $rest, array $f, string $body, array $media, string $fromName): array
{
    $items = [];
    $problem = '';
    $label = '';
    $times = [];
    $firstImg = $media['image'][0]['url'] ?? '';

    switch ($kind) {
        case 'sermon':
            $title = $f['title'] ?? $rest;
            $item = [
                'title' => $title ?: 'Sunday sermon',
                'preacher' => $f['preacher'] ?? '',
                'scripture' => $f['scripture'] ?? '',
                'preached_on' => parse_date($f['date'] ?? '') ?? date('Y-m-d'),
                'summary' => $body,
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
            $cat = $cat ?: 'Fellowship';
            foreach ($media['image'] as $i => $img) {
                $items[] = [
                    'file' => $img['url'],
                    'caption' => ($f['caption'] ?? $caption) ?: caption_from_file($img['url']),
                    'category' => $cat,
                    'taken_on' => parse_date($f['date'] ?? '') ?? date('Y-m-d'),
                ];
            }
            if (!$items) $problem = 'No photos were attached (iPhone HEIC photos must be sent as JPG).';
            $label = count($items) . ' photo' . (count($items) === 1 ? '' : 's') . " in $cat";
            break;

        case 'event':
            $date = parse_date($f['date'] ?? '');
            $time = $f['time'] ?? '';
            $t = $time !== '' ? strtotime($time) : false;
            $title = $f['title'] ?? $rest;
            $items[] = [
                'title' => $title ?: 'Church event',
                'kind' => $f['kind'] ?? '',
                'starts_at' => ($date ?? date('Y-m-d', strtotime('+7 days'))) . ' ' . ($t ? date('H:i:00', $t) : '09:00:00'),
                'venue' => $f['venue'] ?? 'PHOMI, Burweta',
                'details' => $body,
                'cover' => $firstImg,
            ];
            if (!$date) $problem = 'No date was found for the event. Check it before it goes live.';
            $label = $items[0]['title'];
            break;

        case 'announcement':
            $title = $f['title'] ?? $rest;
            $items[] = [
                'title' => $title ?: mb_substr($body, 0, 80),
                'body' => $body,
                'link' => $f['link'] ?? '',
                'starts_on' => date('Y-m-d'),
                'ends_on' => parse_date($f['until'] ?? '') ?? date('Y-m-d', strtotime('+14 days')),
            ];
            $label = $items[0]['title'];
            break;

        case 'video':
            [$cat, $title] = split_video_category($rest, $f['category'] ?? '');
            $title = ($f['title'] ?? $title) ?: 'Church video';
            $date = parse_date($f['date'] ?? '') ?? date('Y-m-d');
            $links = isset($f['link']) ? [$f['link']] : video_links($body);
            $all = count($links) + count($media['video']);
            $n = 0;
            foreach ($links as $l) {
                $n++;
                $items[] = ['title' => $all > 1 ? "$title ($n)" : $title, 'link' => $l, 'cover' => $firstImg, 'category' => $cat, 'posted_on' => $date];
            }
            foreach ($media['video'] as $v) {
                $n++;
                $items[] = ['title' => $all > 1 ? "$title ($n)" : $title, 'video' => $v['url'], 'cover' => $firstImg, 'category' => $cat, 'posted_on' => $date];
            }
            if (!$items) $problem = 'No YouTube, TikTok or Facebook link and no video file were found in the email.';
            $label = count($items) === 1 ? $title : count($items) . ' videos';
            break;

        case 'testimony':
            $items[] = [
                'name' => $fromName,
                'title' => $rest,
                'body' => $body,
            ];
            $label = $items[0]['title'] ?: 'Testimony';
            break;

        case 'times':
            $map = ['sunday' => 'times_sunday', 'prayer_day' => 'times_prayer_day', 'prayer_time' => 'times_prayer_time', 'bible_day' => 'times_bible_day', 'bible_time' => 'times_bible_time'];
            foreach ($map as $k => $setting) {
                $v = trim((string)($f[$k] ?? ''));
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

function split_video_category(string $rest, string $explicit): array
{
    foreach (video_categories() as $c) {
        if (strcasecmp(trim($explicit), $c) === 0) return [$c, $rest];
        if (preg_match('/^' . preg_quote($c, '/') . '\b\s*[,:\-–]\s*(.*)$/i', $rest, $mm)) return [$c, trim($mm[1])];
    }
    return ['Worship', $rest];
}

function apply_times(array $times): void
{
    settings_save($times, 'Changed service times');
}

function ingest_reply(string $to, string $subject, string $kind, string $status, string $label, array $notes): void
{
    $page = site_url(KIND_PAGE[$kind] ?? '/');
    $what = ['sermon' => 'sermon', 'photo' => 'photos', 'event' => 'event', 'announcement' => 'announcement', 'testimony' => 'testimony', 'video' => 'video', 'times' => 'new service times'][$kind] ?? 'update';
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
            if (row("SELECT id FROM $table WHERE id = ?", [(int)$id])) resource_update($table, (int)$id, ['status' => $approve ? 'live' : 'hidden']);
        }
    }
    q('UPDATE inbox SET status = ?, approve_token = ? WHERE id = ?', [$approve ? 'published' : 'rejected', '', $it['id']]);
    if ($approve && $it['from_email']) {
        send_mail($it['from_email'], 'Re: ' . $it['subject'], "Good news: your update is now on the website.\n" . site_url(KIND_PAGE[$type] ?? '/') . "\n\nPotter's House website");
    }
    return ['status' => $approve ? 'published' : 'rejected', 'page' => KIND_PAGE[$type] ?? '/'];
}
