<?php
declare(strict_types=1);

const STATUSES = ['live', 'review', 'hidden'];

// Everything the admin page can list and edit. The dashboard reads this same shape from /api/admin/schema.
function resources(): array
{
    $status = ['type' => 'select', 'options' => STATUSES, 'default' => 'live', 'label' => 'Status'];
    return [
        'sermons' => [
            'label' => 'Sermons',
            'order' => 'preached_on DESC, id DESC',
            'fields' => [
                'title' => ['type' => 'text', 'required' => true, 'max' => 200, 'label' => 'Title'],
                'preacher' => ['type' => 'text', 'max' => 120, 'label' => 'Preacher'],
                'preached_on' => ['type' => 'date', 'label' => 'Date preached'],
                'scripture' => ['type' => 'text', 'max' => 160, 'label' => 'Scripture'],
                'summary' => ['type' => 'textarea', 'max' => 6000, 'label' => 'Summary or notes'],
                'media_url' => ['type' => 'url', 'max' => 500, 'label' => 'YouTube, TikTok or Facebook link'],
                'audio' => ['type' => 'file', 'accept' => 'audio/*', 'label' => 'Audio file'],
                'video' => ['type' => 'file', 'accept' => 'video/mp4', 'label' => 'Video file'],
                'cover' => ['type' => 'file', 'accept' => 'image/*', 'label' => 'Cover picture'],
                'status' => $status,
            ],
        ],
        'videos' => [
            'label' => 'Videos',
            'order' => 'posted_on DESC, id DESC',
            'fields' => [
                'title' => ['type' => 'text', 'required' => true, 'max' => 200, 'label' => 'Title'],
                'link' => ['type' => 'url', 'max' => 500, 'label' => 'YouTube, TikTok or Facebook link'],
                'video' => ['type' => 'file', 'accept' => 'video/mp4', 'label' => 'Or upload a video file'],
                'cover' => ['type' => 'file', 'accept' => 'image/*', 'label' => 'Cover picture (optional)'],
                'category' => ['type' => 'select', 'options' => video_categories(), 'default' => 'Worship', 'label' => 'Category'],
                'posted_on' => ['type' => 'date', 'label' => 'Date'],
                'status' => $status,
            ],
        ],
        'verses' => [
            'label' => 'Planned verses',
            'order' => 'show_on DESC, id DESC',
            'fields' => [
                'show_on' => ['type' => 'date', 'required' => true, 'label' => 'Date (for a weekly verse, any day of that week)'],
                'kind' => ['type' => 'select', 'options' => ['day', 'week'], 'default' => 'day', 'label' => 'Verse of the Day or of the Week'],
                'reference' => ['type' => 'text', 'required' => true, 'max' => 80, 'label' => 'Bible reference (e.g. John 3:16 or Psalm 23:1-4)'],
                'theme' => ['type' => 'text', 'max' => 80, 'label' => 'Theme (e.g. Hope)'],
                'note' => ['type' => 'textarea', 'max' => 1500, 'label' => 'A short word from the pastor (optional, shown with the verse)'],
                'status' => $status,
            ],
        ],
        'subscribers' => [
            'label' => 'Email list',
            'order' => 'id DESC',
            'fields' => [
                'email' => ['type' => 'email', 'required' => true, 'max' => 190, 'label' => 'Email address'],
                'name' => ['type' => 'text', 'max' => 120, 'label' => 'Name'],
                'daily' => ['type' => 'bool', 'default' => '1', 'label' => 'Verse of the Day every morning'],
                'weekly' => ['type' => 'bool', 'default' => '1', 'label' => 'Weekly letter on Monday'],
                'lang' => ['type' => 'select', 'options' => ['en', 'lg'], 'default' => 'en', 'label' => 'Language (en = English, lg = Luganda)'],
                'status' => ['type' => 'select', 'options' => ['active', 'pending', 'unsubscribed'], 'default' => 'active', 'label' => 'Status'],
            ],
        ],
        'sms_contacts' => [
            'label' => 'Phone list',
            'order' => 'id DESC',
            'fields' => [
                'phone' => ['type' => 'text', 'required' => true, 'max' => 30, 'label' => 'Phone number (e.g. 0772 123456)'],
                'name' => ['type' => 'text', 'max' => 120, 'label' => 'Name'],
                'daily' => ['type' => 'bool', 'default' => '1', 'label' => 'Verse of the Day by SMS'],
                'call_me' => ['type' => 'bool', 'default' => '0', 'label' => 'Asked for a call from the church'],
                'lang' => ['type' => 'select', 'options' => ['en', 'lg'], 'default' => 'en', 'label' => 'Language (en = English, lg = Luganda)'],
                'status' => ['type' => 'select', 'options' => ['active', 'stopped'], 'default' => 'active', 'label' => 'Status'],
            ],
        ],
        'photos' => [
            'label' => 'Gallery photos',
            'order' => 'created_at DESC, id DESC',
            'fields' => [
                'file' => ['type' => 'file', 'accept' => 'image/*', 'required' => true, 'label' => 'Photo'],
                'caption' => ['type' => 'text', 'max' => 300, 'label' => 'Caption'],
                'category' => ['type' => 'select', 'options' => gallery_categories(), 'default' => 'Fellowship', 'label' => 'Category'],
                'taken_on' => ['type' => 'date', 'label' => 'Date taken'],
                'status' => $status,
            ],
        ],
        'events' => [
            'label' => 'Events',
            'order' => 'starts_at DESC',
            'fields' => [
                'title' => ['type' => 'text', 'required' => true, 'max' => 200, 'label' => 'Event name'],
                'kind' => ['type' => 'text', 'max' => 60, 'label' => 'Type (e.g. Crusade, Conference)'],
                'starts_at' => ['type' => 'datetime', 'required' => true, 'label' => 'Starts'],
                'ends_at' => ['type' => 'datetime', 'label' => 'Ends'],
                'venue' => ['type' => 'text', 'max' => 200, 'default' => 'PHOMI, Burweta', 'label' => 'Venue'],
                'details' => ['type' => 'textarea', 'max' => 4000, 'label' => 'Details'],
                'cover' => ['type' => 'file', 'accept' => 'image/*', 'label' => 'Picture'],
                'status' => $status,
            ],
        ],
        'announcements' => [
            'label' => 'Announcements',
            'order' => 'id DESC',
            'fields' => [
                'title' => ['type' => 'text', 'required' => true, 'max' => 200, 'label' => 'Headline'],
                'body' => ['type' => 'textarea', 'max' => 2000, 'label' => 'Details'],
                'link' => ['type' => 'url', 'max' => 300, 'label' => 'Link (optional)'],
                'starts_on' => ['type' => 'date', 'label' => 'Show from'],
                'ends_on' => ['type' => 'date', 'label' => 'Show until'],
                'status' => $status,
            ],
        ],
        'testimonies' => [
            'label' => 'Testimonies',
            'order' => 'id DESC',
            'fields' => [
                'name' => ['type' => 'text', 'max' => 120, 'label' => 'Name'],
                'title' => ['type' => 'text', 'max' => 200, 'label' => 'Headline'],
                'body' => ['type' => 'textarea', 'required' => true, 'max' => 6000, 'label' => 'Testimony'],
                'status' => ['type' => 'select', 'options' => STATUSES, 'default' => 'review', 'label' => 'Status'],
            ],
        ],
        'senders' => [
            'label' => 'Approved senders',
            'order' => 'email ASC',
            'fields' => [
                'email' => ['type' => 'email', 'required' => true, 'max' => 190, 'label' => 'Email address'],
                'name' => ['type' => 'text', 'max' => 120, 'label' => 'Name'],
            ],
        ],
    ];
}

function gallery_categories(): array
{
    return ['Worship', 'Outreach', 'Special service', 'Bible Study', 'Fellowship', 'Building'];
}

function video_categories(): array
{
    return ['Worship', 'Sermon clip', 'Testimony', 'Outreach', 'Events', 'Bible Study'];
}

// Video links: TikTok share links (vm.tiktok.com/…) are opened once so the site can embed the full video address.
function video_link(string $url): string
{
    $url = trim($url);
    if (!preg_match('#^https?://(vm|vt)\.tiktok\.com/|^https?://(www\.)?tiktok\.com/t/#i', $url) || !function_exists('curl_init')) return $url;
    try {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_NOBODY => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => false, CURLOPT_TIMEOUT => 6,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; PHOMI website)']);
        curl_exec($ch);
        $loc = (string)curl_getinfo($ch, CURLINFO_REDIRECT_URL);
        curl_close($ch);
        if (preg_match('#^https://(www\.)?tiktok\.com/@[^/]+/video/\d+#', $loc, $mm)) return $mm[0];
    } catch (Throwable $e) {
        // keep the short link; the site shows a "Watch on TikTok" button for it
    }
    return $url;
}

function resource(string $name): array
{
    $r = resources()[$name] ?? null;
    if (!$r) throw new ApiError(404, 'Unknown section.');
    return $r;
}

// Checks and cleans submitted values. $partial = only validate fields that were sent.
function clean_fields(array $def, array $in, bool $partial = false): array
{
    $out = [];
    foreach ($def['fields'] as $key => $f) {
        if ($partial && !array_key_exists($key, $in)) continue;
        $v = $in[$key] ?? ($f['default'] ?? '');
        if (is_bool($v)) $v = $v ? '1' : '0';
        $v = is_scalar($v) ? trim((string)$v) : '';
        $label = $f['label'] ?? $key;
        if (!empty($f['required']) && $v === '') throw new ApiError(422, "$label is needed.");
        switch ($f['type']) {
            case 'date':
                if ($v !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) throw new ApiError(422, "$label must be a date.");
                $v = $v === '' ? null : $v;
                break;
            case 'datetime':
                if ($v !== '') {
                    $t = strtotime(str_replace('T', ' ', $v));
                    if ($t === false) throw new ApiError(422, "$label must be a date and time.");
                    $v = date('Y-m-d H:i:s', $t);
                } else {
                    $v = null;
                }
                break;
            case 'url':
                if ($v !== '' && !preg_match('#^https?://#i', $v)) throw new ApiError(422, "$label must start with https://");
                break;
            case 'email':
                $v = strtolower($v);
                if ($v !== '' && !filter_var($v, FILTER_VALIDATE_EMAIL)) throw new ApiError(422, "$label is not a valid email.");
                break;
            case 'bool':
                $v = in_array($v, ['1', 'true', 'on', 'yes'], true) ? 1 : 0;
                break;
            case 'select':
                if (!in_array($v, $f['options'], true)) $v = $f['default'] ?? $f['options'][0];
                break;
            case 'file':
                $prefix = rtrim((string)config('uploads_url'), '/') . '/';
                if ($v !== '' && (!preg_match('#^/[A-Za-z0-9/_.-]+$#', $v) || str_contains($v, '..') || (!str_starts_with($v, $prefix) && !str_starts_with($v, '/img/')))) {
                    throw new ApiError(422, "$label must be an uploaded file.");
                }
                break;
        }
        if ($f['type'] === 'url' && $v !== '') $v = video_link($v);
        if (is_string($v) && isset($f['max'])) $v = mb_substr($v, 0, $f['max']);
        $out[$key] = $v;
    }
    return $out;
}

function resource_list(string $name, array $opts = []): array
{
    $def = resource($name);
    $where = [];
    $args = [];
    if (!empty($opts['status']) && isset($def['fields']['status'])) {
        $where[] = 'status = ?';
        $args[] = $opts['status'];
    }
    if (!empty($opts['q'])) {
        $text = array_keys(array_filter($def['fields'], fn($f) => in_array($f['type'], ['text', 'textarea', 'email'], true)));
        if ($text) {
            $where[] = '(' . implode(' OR ', array_map(fn($c) => "$c LIKE ?", $text)) . ')';
            foreach ($text as $_) $args[] = '%' . $opts['q'] . '%';
        }
    }
    $limit = min(500, max(1, (int)($opts['limit'] ?? 200)));
    $sql = "SELECT * FROM $name" . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . " ORDER BY {$def['order']} LIMIT $limit";
    return rows($sql, $args);
}

function resource_create(string $name, array $in, string $source = 'admin'): array
{
    $def = resource($name);
    $data = clean_fields($def, $in);
    if ($name === 'videos' && $data['link'] === '' && $data['video'] === '') throw new ApiError(422, 'Add a YouTube, TikTok or Facebook link, or upload a video file.');
    resource_check($name, $data);
    if ($name === 'subscribers') {
        $data['token'] = random_token(20);
        if ($data['status'] === 'active') $data['confirmed_at'] = now();
    }
    if ($name !== 'senders') $data['source'] = $source;
    $data['created_at'] = now();
    if ($name === 'senders' && row('SELECT id FROM senders WHERE email = ?', [$data['email']])) {
        throw new ApiError(409, 'That sender is already on the list.');
    }
    if ($name === 'sms_contacts' && row('SELECT id FROM sms_contacts WHERE phone = ?', [$data['phone']])) {
        throw new ApiError(409, 'That number is already on the SMS list.');
    }
    if ($name === 'subscribers' && row('SELECT id FROM subscribers WHERE email = ?', [$data['email']])) {
        throw new ApiError(409, 'That address is already on the email list.');
    }
    $id = insert($name, $data);
    $r = row("SELECT * FROM $name WHERE id = ?", [$id]);
    log_change('create', $name, $id, null, $r, 'Added ' . row_label($name, $r) . ($source === 'email' ? ' (by email, waiting for approval)' : ''));
    return $r;
}

function resource_update(string $name, int $id, array $in): array
{
    $def = resource($name);
    $old = row("SELECT * FROM $name WHERE id = ?", [$id]);
    if (!$old) throw new ApiError(404, 'Not found.');
    $data = clean_fields($def, $in, true);
    $merged = $data + $old;
    resource_check($name, $merged);
    foreach (['reference', 'show_on', 'phone'] as $k) if (array_key_exists($k, $data)) $data[$k] = $merged[$k];
    if ($name === 'videos' && ($data['link'] ?? $old['link']) === '' && ($data['video'] ?? $old['video']) === '') {
        throw new ApiError(422, 'Add a YouTube, TikTok or Facebook link, or upload a video file.');
    }
    update($name, $id, $data);
    $r = row("SELECT * FROM $name WHERE id = ?", [$id]);
    [$b, $a] = diff_rows($old, $r);
    if ($a) log_change('update', $name, $id, $b, $a, change_summary($name, $r, $b, $a));
    return $r;
}

// Extra checks for some sections
function resource_check(string $name, array &$data): void
{
    if ($name === 'sms_contacts' && isset($data['phone'])) {
        $p = sms_phone((string)$data['phone']);
        if (!$p) throw new ApiError(422, 'That phone number was not understood. Write it like 0772 123456, or with + and the country code.');
        $data['phone'] = $p;
    }
    if ($name === 'verses' && isset($data['reference'])) {
        $p = bible_parse_ref($data['reference']);
        if (!$p) throw new ApiError(422, 'That Bible reference was not understood. Write it like John 3:16 or Psalm 23:1-4.');
        $data['reference'] = bible_ref_label($p);
        if (bible_ready() && !bible_passage($data['reference'])) throw new ApiError(422, "{$data['reference']} was not found in the Bible.");
        if (($data['kind'] ?? 'day') === 'week' && !empty($data['show_on'])) $data['show_on'] = week_start($data['show_on']);
    }
}

function change_summary(string $name, array $r, array $b, array $a): string
{
    if (array_keys($a) === ['status']) {
        $word = ['live' => 'Published', 'hidden' => 'Hid', 'review' => 'Held for review'][$a['status']] ?? 'Changed';
        return "$word " . row_label($name, $r);
    }
    return 'Edited ' . row_label($name, $r) . ' (' . implode(', ', array_map(fn($k) => str_replace('_', ' ', $k), array_keys($a))) . ')';
}

// Files are kept on delete so that the delete can be undone from the change history.
function resource_delete(string $name, int $id): void
{
    resource($name);
    $r = row("SELECT * FROM $name WHERE id = ?", [$id]);
    if (!$r) return;
    q("DELETE FROM $name WHERE id = ?", [$id]);
    log_change('delete', $name, $id, $r, null, 'Deleted ' . row_label($name, $r));
}

// What every visitor's browser loads to keep the site current.
function public_content(): array
{
    $today = date('Y-m-d');
    $settings = settings_all();
    $public = [];
    foreach (PUBLIC_SETTINGS as $k) if ($settings[$k] !== '') $public[$k] = $settings[$k];

    $sermons = rows("SELECT id, title, preacher, preached_on, scripture, summary, media_url, audio, video, cover FROM sermons WHERE status = 'live' ORDER BY preached_on DESC, id DESC LIMIT 60");
    $videos = rows("SELECT id, title, link, video, cover, category, posted_on FROM videos WHERE status = 'live' ORDER BY posted_on DESC, id DESC LIMIT 60");
    $photos = array_map(fn($p) => $p + ['thumb' => thumb_of($p['file'])],
        rows("SELECT id, file, caption, category, taken_on FROM photos WHERE status = 'live' ORDER BY created_at DESC, id DESC LIMIT 300"));
    $events = rows("SELECT id, title, kind, starts_at, ends_at, venue, details, cover FROM events WHERE status = 'live' AND (starts_at >= ? OR ends_at >= ?) ORDER BY starts_at ASC LIMIT 40", ["$today 00:00:00", "$today 00:00:00"]);
    $news = rows("SELECT id, title, body, link, starts_on, ends_on FROM announcements WHERE status = 'live' AND (starts_on IS NULL OR starts_on <= ?) AND (ends_on IS NULL OR ends_on >= ?) ORDER BY id DESC LIMIT 5", [$today, $today]);
    $testimonies = rows("SELECT id, name, title, body, created_at FROM testimonies WHERE status = 'live' ORDER BY id DESC LIMIT 30");

    return [
        'settings' => $public,
        'sermons' => $sermons,
        'videos' => $videos,
        'photos' => $photos,
        'events' => $events,
        'announcements' => $news,
        'testimonies' => $testimonies,
        'payments' => payment_provider() ? 'push' : 'ussd',
        'verse' => ['day' => verse_for($today, 'day'), 'week' => verse_for($today, 'week')],
        'text' => site_text_all() ?: new stdClass(),
        'verse_lg' => ['day' => verse_for($today, 'day', 'lug'), 'week' => verse_for($today, 'week', 'lug')],
    ];
}
