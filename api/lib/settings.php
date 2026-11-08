<?php
declare(strict_types=1);

// Settings the admin can change from the dashboard. Defaults match the current website.
const SETTING_DEFAULTS = [
    // Automatic updates by email
    'inbox_address' => '',
    'imap_host' => 'imap.hostinger.com',
    'imap_port' => '993',
    'imap_user' => '',
    'imap_pass' => '', // stored encrypted
    'notify_email' => '', // who gets alerts about prayer requests, messages and gifts

    // Church details shown on the site (blank = use the built-in text)
    'times_sunday' => '',
    'times_prayer_day' => '',
    'times_prayer_time' => '',
    'times_bible_day' => '',
    'times_bible_time' => '',
    'whatsapp' => '',
    'phones' => '',
    'email' => '',
    'facebook' => '',
    'youtube' => '',
    'tiktok' => '',
    'instagram' => '',
    'whatsapp_channel' => '',
    'site_theme' => '', // fonts, colours and text size for the whole site (Admin → Site text)
    'default_lang' => 'en', // 'en' or 'lg': the language a first-time visitor sees

    // Bible and verse emails
    'bible_default' => 'kjv', // 'kjv' or 'web'
    'letters_on' => '0', // '1' sends the verse emails
    'letters_mode' => 'auto', // 'auto' sends planned emails unless paused; 'approve' waits for an admin each time
    'letters_time' => '06:00',
    'sms_on' => '0', // '1' sends the daily verse by SMS (needs an SMS account in phomi-config.php)

    // The private copy of the email and phone lists (never shown on the site)
    'lists_email' => '', // e.g. the pastor's own Gmail; blank = the alerts address above
    'lists_weekly' => '1', // '1' emails both lists there every Monday
    'lists_sent_on' => '', // set by the system

    'momo_mtn_number' => '',
    'momo_mtn_name' => '',
    'momo_airtel_number' => '',
    'momo_airtel_name' => '',
    'bank_name' => '',
    'bank_account' => '',
    'bank_swift' => '',
];

// Settings that are safe to show to every visitor
const PUBLIC_SETTINGS = [
    'times_sunday', 'times_prayer_day', 'times_prayer_time', 'times_bible_day', 'times_bible_time',
    'whatsapp', 'phones', 'email', 'facebook', 'youtube', 'tiktok', 'instagram', 'whatsapp_channel', 'bible_default', 'site_theme', 'default_lang', 'momo_mtn_number', 'momo_mtn_name', 'momo_airtel_number', 'momo_airtel_name',
    'bank_name', 'bank_account', 'bank_swift',
];

const SECRET_SETTINGS = ['imap_pass'];

function settings_all(): array
{
    $out = SETTING_DEFAULTS;
    foreach (rows('SELECT name, value FROM settings') as $r) {
        if (array_key_exists($r['name'], $out)) $out[$r['name']] = (string)$r['value'];
    }
    return $out;
}

// All stored settings as one lookup table (name => value), read from the database once per request
function settings_map(bool $reset = false): array
{
    static $map = null;
    if ($reset) { $map = null; return []; }
    if ($map === null) {
        $map = [];
        foreach (rows('SELECT name, value FROM settings') as $r) $map[$r['name']] = (string)$r['value'];
    }
    return $map;
}

function setting(string $name): string
{
    $map = settings_map();
    $v = array_key_exists($name, $map) ? $map[$name] : (SETTING_DEFAULTS[$name] ?? '');
    if (in_array($name, SECRET_SETTINGS, true) && $v !== '') $v = decrypt_secret($v);
    return $v;
}

function setting_set(string $name, string $value): void
{
    if (!array_key_exists($name, SETTING_DEFAULTS)) return;
    if (in_array($name, SECRET_SETTINGS, true) && $value !== '') $value = encrypt_secret($value);
    if (row('SELECT id FROM settings WHERE name = ?', [$name])) {
        q('UPDATE settings SET value = ? WHERE name = ?', [$value, $name]);
    } else {
        insert('settings', ['name' => $name, 'value' => $value]);
    }
    settings_map(true);
    if (in_array($name, PUBLIC_SETTINGS, true)) content_changed();
}

// The stored value as saved (secrets stay encrypted). Used by the change history.
function setting_raw(string $name): string
{
    $map = settings_map();
    return array_key_exists($name, $map) ? $map[$name] : (SETTING_DEFAULTS[$name] ?? '');
}

function setting_store(string $name, string $value): void
{
    if (row('SELECT id FROM settings WHERE name = ?', [$name])) q('UPDATE settings SET value = ? WHERE name = ?', [$value, $name]);
    else insert('settings', ['name' => $name, 'value' => $value]);
    settings_map(true);
    content_changed();
}

// ---------- Ready-made answer for /api/content ----------
// Every visitor asks for the same content, so it is built once and saved as a file. It is rebuilt when an admin
// changes anything (content_changed, called from the change history and settings), when the day changes, and
// at least every 10 minutes as a safety net.
function cache_dir(): string
{
    $dir = (string)config('cache_dir', '');
    if ($dir === '') {
        $db = config('db');
        $dir = sys_get_temp_dir() . '/phomi-cache-' . substr(md5(json_encode($db['dsn'] ?? '') . config('app_key')), 0, 12);
    }
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    return $dir;
}

function content_changed(): void
{
    @file_put_contents(cache_dir() . '/generation', uniqid('', true));
}

function content_json(): string
{
    $dir = cache_dir();
    $gen = (string)@file_get_contents("$dir/generation");
    $file = "$dir/content-" . date('Y-m-d') . '-' . intdiv(time(), 600) . '-' . substr(md5($gen), 0, 10) . '.json';
    if (is_file($file) && ($json = @file_get_contents($file)) !== false && $json !== '') return $json;
    $json = json_encode(public_content(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $tmp = "$file." . getmypid();
    if (@file_put_contents($tmp, $json) !== false) @rename($tmp, $file);
    if (random_int(1, 20) === 1) foreach (glob("$dir/content-*.json") ?: [] as $old) if ($old !== $file && filemtime($old) < time() - 900) @unlink($old);
    return $json;
}

// Saves several settings at once and records them in the change history (passwords are never recorded).
function settings_save(array $values, string $summary = ''): void
{
    $before = [];
    $after = [];
    foreach ($values as $k => $v) {
        if (!array_key_exists($k, SETTING_DEFAULTS)) continue;
        if ($k === 'site_theme') $v = site_theme_clean($v);
        if ($k === 'default_lang') $v = $v === 'lg' ? 'lg' : 'en';
        $old = setting_raw($k);
        setting_set($k, (string)$v);
        if (in_array($k, SECRET_SETTINGS, true)) continue;
        if ($old !== (string)$v) {
            $before[$k] = $old;
            $after[$k] = (string)$v;
        }
    }
    if ($after) log_change('settings', 'settings', null, $before, $after, $summary ?: 'Changed ' . implode(', ', array_map(fn($k) => str_replace('_', ' ', $k), array_keys($after))));
}

function app_key(): string
{
    $k = (string)config('app_key');
    if (strlen($k) < 16) throw new ApiError(500, 'app_key is missing from the server config.');
    return hash('sha256', $k, true);
}

function encrypt_secret(string $plain): string
{
    $iv = random_bytes(12);
    $tag = '';
    $c = openssl_encrypt($plain, 'aes-256-gcm', app_key(), OPENSSL_RAW_DATA, $iv, $tag);
    return 'v1:' . base64_encode($iv . $tag . $c);
}

function decrypt_secret(string $stored): string
{
    if (!str_starts_with($stored, 'v1:')) return $stored;
    $raw = base64_decode(substr($stored, 3));
    $p = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', app_key(), OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
    return $p === false ? '' : $p;
}
