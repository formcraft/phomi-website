<?php
declare(strict_types=1);

// Change history: every change to content and settings is recorded with what it was before,
// so an admin can see who changed what and undo it.

const HISTORY_TABLES = ['sermons', 'videos', 'photos', 'events', 'announcements', 'testimonies', 'senders', 'settings'];

// Who is making changes in this request: an admin's email, "email: sender@…" or "approval link".
function actor(?string $set = null): string
{
    static $who = 'system';
    if ($set !== null) $who = mb_substr($set, 0, 190);
    return $who;
}

function log_change(string $action, string $table, ?int $id, ?array $before, ?array $after, string $summary): void
{
    insert('changes', [
        'created_at' => now(),
        'actor' => actor(),
        'action' => $action,
        'table_name' => $table,
        'row_id' => $id,
        'summary' => mb_substr($summary, 0, 300),
        'before_json' => $before === null ? null : json_encode($before, JSON_UNESCAPED_UNICODE),
        'after_json' => $after === null ? null : json_encode($after, JSON_UNESCAPED_UNICODE),
    ]);
}

function row_label(string $table, array $r): string
{
    $name = ['sermons' => 'sermon', 'videos' => 'video', 'photos' => 'photo', 'events' => 'event', 'announcements' => 'announcement', 'testimonies' => 'testimony', 'senders' => 'approved sender'][$table] ?? $table;
    $title = $r['title'] ?? $r['caption'] ?? $r['email'] ?? '';
    return $title !== '' ? "$name \"" . mb_substr((string)$title, 0, 80) . '"' : $name;
}

function history_list(int $limit = 200): array
{
    $items = rows('SELECT id, created_at, actor, action, table_name, row_id, summary, undone_at, undone_by FROM changes ORDER BY id DESC LIMIT ' . min(500, max(1, $limit)));
    return $items;
}

// Puts things back the way they were before change $id.
function history_undo(int $id): array
{
    $c = row('SELECT * FROM changes WHERE id = ?', [$id]);
    if (!$c) throw new ApiError(404, 'That change was not found.');
    if ($c['undone_at']) throw new ApiError(409, 'That change has already been undone.');
    $table = $c['table_name'];
    if (!in_array($table, HISTORY_TABLES, true)) throw new ApiError(422, 'This change cannot be undone.');
    $before = $c['before_json'] ? json_decode($c['before_json'], true) : null;
    $after = $c['after_json'] ? json_decode($c['after_json'], true) : null;
    $rid = $c['row_id'] !== null ? (int)$c['row_id'] : null;

    if ($table === 'settings') {
        // Only undo if nobody changed these settings again since
        foreach ($after ?? [] as $k => $v) {
            if (setting_raw($k) !== (string)$v) throw new ApiError(409, "The setting \"$k\" was changed again later. Undo the later change first.");
        }
        foreach ($before ?? [] as $k => $v) setting_store($k, (string)$v);
        log_change('settings', 'settings', null, $after, $before, 'Undid: ' . $c['summary']);
    } elseif ($c['action'] === 'create') {
        $now = row("SELECT * FROM $table WHERE id = ?", [$rid]);
        if ($now) {
            q("DELETE FROM $table WHERE id = ?", [$rid]);
            log_change('delete', $table, $rid, $now, null, 'Undid adding ' . row_label($table, $now));
        }
    } elseif ($c['action'] === 'delete') {
        if (row("SELECT id FROM $table WHERE id = ?", [$rid])) throw new ApiError(409, 'It has already been put back.');
        insert($table, $before);
        log_change('create', $table, $rid, null, $before, 'Restored ' . row_label($table, $before));
    } else { // update
        $now = row("SELECT * FROM $table WHERE id = ?", [$rid]);
        if (!$now) throw new ApiError(409, 'That item has since been deleted. Undo the delete first.');
        foreach ($after ?? [] as $k => $v) {
            if ((string)($now[$k] ?? '') !== (string)($v ?? '')) throw new ApiError(409, 'That item was changed again later. Undo the later change first.');
        }
        update($table, $rid, $before ?? []);
        log_change('update', $table, $rid, $after, $before, 'Undid: ' . $c['summary']);
    }
    q('UPDATE changes SET undone_at = ?, undone_by = ? WHERE id = ?', [now(), actor(), $id]);
    return ['ok' => true];
}

// Only the fields that actually changed, before and after
function diff_rows(array $old, array $new): array
{
    $b = [];
    $a = [];
    foreach ($new as $k => $v) {
        if (!array_key_exists($k, $old)) continue;
        if ((string)($old[$k] ?? '') !== (string)($v ?? '')) {
            $b[$k] = $old[$k];
            $a[$k] = $v;
        }
    }
    return [$b, $a];
}
