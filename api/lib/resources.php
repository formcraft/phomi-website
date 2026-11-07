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
                'media_url' => ['type' => 'url', 'max' => 500, 'label' => 'YouTube or Facebook link'],
                'audio' => ['type' => 'file', 'accept' => 'audio/*', 'label' => 'Audio file'],
                'video' => ['type' => 'file', 'accept' => 'video/mp4', 'label' => 'Video file'],
                'cover' => ['type' => 'file', 'accept' => 'image/*', 'label' => 'Cover picture'],
                'status' => $status,
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
                'publish_direct' => ['type' => 'bool', 'label' => 'Publish without review'],
            ],
        ],
    ];
}

function gallery_categories(): array
{
    return ['Worship', 'Outreach', 'Special service', 'Bible Study', 'Fellowship', 'Building'];
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
    if ($name !== 'senders') $data['source'] = $source;
    $data['created_at'] = now();
    if ($name === 'senders' && row('SELECT id FROM senders WHERE email = ?', [$data['email']])) {
        throw new ApiError(409, 'That sender is already on the list.');
    }
    $id = insert($name, $data);
    return row("SELECT * FROM $name WHERE id = ?", [$id]);
}

function resource_update(string $name, int $id, array $in): array
{
    $def = resource($name);
    if (!row("SELECT id FROM $name WHERE id = ?", [$id])) throw new ApiError(404, 'Not found.');
    update($name, $id, clean_fields($def, $in, true));
    return row("SELECT * FROM $name WHERE id = ?", [$id]);
}

function resource_delete(string $name, int $id): void
{
    $def = resource($name);
    $r = row("SELECT * FROM $name WHERE id = ?", [$id]);
    if (!$r) return;
    foreach ($def['fields'] as $k => $f) {
        if ($f['type'] === 'file' && !empty($r[$k])) delete_media($r[$k]);
    }
    q("DELETE FROM $name WHERE id = ?", [$id]);
}

// What every visitor's browser loads to keep the site current.
function public_content(): array
{
    $today = date('Y-m-d');
    $settings = settings_all();
    $public = [];
    foreach (PUBLIC_SETTINGS as $k) if ($settings[$k] !== '') $public[$k] = $settings[$k];

    $sermons = rows("SELECT id, title, preacher, preached_on, scripture, summary, media_url, audio, video, cover FROM sermons WHERE status = 'live' ORDER BY preached_on DESC, id DESC LIMIT 60");
    $photos = array_map(fn($p) => $p + ['thumb' => thumb_of($p['file'])],
        rows("SELECT id, file, caption, category, taken_on FROM photos WHERE status = 'live' ORDER BY created_at DESC, id DESC LIMIT 300"));
    $events = rows("SELECT id, title, kind, starts_at, ends_at, venue, details, cover FROM events WHERE status = 'live' AND (starts_at >= ? OR ends_at >= ?) ORDER BY starts_at ASC LIMIT 40", ["$today 00:00:00", "$today 00:00:00"]);
    $news = rows("SELECT id, title, body, link, starts_on, ends_on FROM announcements WHERE status = 'live' AND (starts_on IS NULL OR starts_on <= ?) AND (ends_on IS NULL OR ends_on >= ?) ORDER BY id DESC LIMIT 5", [$today, $today]);
    $testimonies = rows("SELECT id, name, title, body, created_at FROM testimonies WHERE status = 'live' ORDER BY id DESC LIMIT 30");

    return [
        'settings' => $public,
        'sermons' => $sermons,
        'photos' => $photos,
        'events' => $events,
        'announcements' => $news,
        'testimonies' => $testimonies,
        'payments' => payment_provider() ? 'push' : 'ussd',
    ];
}
