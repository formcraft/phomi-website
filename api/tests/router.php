<?php
// Local test server that behaves like the Hostinger .htaccess rules:
//   PHOMI_CONFIG=/path/to/config.php php -S 127.0.0.1:8099 -t <web root> api/tests/router.php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Local preview only (scripts/local-server.mjs): read the emails and SMS the site "sent"
if (getenv('PHOMI_LOCAL') === '1' && ($path === '/__mail' || $path === '/__sms')) {
    $cfg = require getenv('PHOMI_CONFIG');
    $file = $path === '/__mail' ? ($cfg['mail_log'] ?? '') : ($cfg['sms']['log'] ?? '');
    $log = is_file($file) ? (string)file_get_contents($file) : '';
    $items = array_reverse(array_filter(array_map('trim', explode("\n----\n", $log))));
    $h = fn($v) => htmlspecialchars($v, ENT_QUOTES);
    $subject = function ($v) { return preg_replace_callback('/=\?UTF-8\?B\?([^?]+)\?=/', fn($m) => base64_decode($m[1]), $v); };
    header('Content-Type: text/html; charset=utf-8');
    header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'");
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' . ($path === '/__mail' ? 'Test emails' : 'Test SMS') . '</title>'
        . '<style>body{font:15px/1.5 system-ui,sans-serif;max-width:860px;margin:0 auto;padding:16px;background:#faf6ef;color:#1B2A47}pre{white-space:pre-wrap;word-break:break-word;background:#fff;border:1px solid #e5dccb;border-radius:10px;padding:14px}a{color:#A03207}</style>'
        . '<h1>' . ($path === '/__mail' ? 'Emails the site sent' : 'SMS the site sent') . '</h1><p>Local preview only: nothing here really left your computer. Newest first. <a href="/__mail">Emails</a> · <a href="/__sms">SMS</a> · <a href="/">Website</a> · <a href="/admin">Admin</a></p>';
    if (!$items) echo '<p>Nothing yet.</p>';
    foreach ($items as $it) {
        $it = $subject($it);
        $html = preg_replace('~(https?://[^\s<]+)~', '<a href="$1">$1</a>', $h($it));
        echo '<pre>' . $html . '</pre>';
    }
    return true;
}
if ($path === '/api/install.php') { require dirname(__DIR__) . '/install.php'; return true; }
if (str_starts_with($path, '/api/') || $path === '/api') { require dirname(__DIR__) . '/index.php'; return true; }
$file = $_SERVER['DOCUMENT_ROOT'] . $path;
if (preg_match('~^/([a-z-]+)$~', $path, $pm) && is_file($_SERVER['DOCUMENT_ROOT'] . "/{$pm[1]}.html")) $index = $_SERVER['DOCUMENT_ROOT'] . "/{$pm[1]}.html";
if ($path !== '/' && is_file($file)) return false; // static files (built site, uploads)
if (str_starts_with($path, '/uploads/')) { http_response_code(404); return true; }
$index ??= $_SERVER['DOCUMENT_ROOT'] . '/index.html';
if (is_file($index)) {
    header('Content-Type: text/html; charset=utf-8');
    // The same security headers as public/.htaccess on Hostinger (minus the HTTPS-only ones, since this is plain http)
    preg_match_all('/^\s*Header always set ([A-Za-z-]+) "(.*)"\s*$/m', (string)@file_get_contents(dirname(__DIR__, 2) . '/public/.htaccess'), $m, PREG_SET_ORDER);
    foreach ($m as [, $name, $value]) {
        if ($name === 'Strict-Transport-Security') continue;
        header("$name: " . trim(str_replace('upgrade-insecure-requests', '', $value), ' ;'));
    }
    readfile($index);
    return true;
}
http_response_code(404);
return true;
