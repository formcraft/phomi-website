<?php
// One-time setup: creates the database tables and the first admin account.
// Open https://<site>/api/install.php?token=<install_token from phomi-config.php>
// Running it again later only adds any new tables; it never deletes data.
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
$token = (string)($_GET['token'] ?? $_POST['token'] ?? '');
$expected = (string)config('install_token');

function page(string $body): void
{
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PHOMI setup</title>'
        . '<body style="font-family:system-ui,sans-serif;background:#F4EDE1;color:#1B2A47;padding:32px 16px;margin:0">'
        . '<main style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:24px">'
        . "<h1 style=\"font-size:22px;margin-top:0\">Potter's House website setup</h1>$body</main></body>";
    exit;
}

if ($expected === '' || strlen($expected) < 12) page('<p>Add an <b>install_token</b> (at least 12 characters) to phomi-config.php first.</p>');
if (!hash_equals($expected, $token)) page('<p>This setup link is not valid.</p>');

$checks = [
    'PHP 8.1 or newer' => version_compare(PHP_VERSION, '8.1.0', '>='),
    'Database connection' => (function () { try { db()->query('SELECT 1'); return true; } catch (Throwable $e) { return false; } })(),
    'GD (photo editing)' => function_exists('imagecreatefromstring'),
    'cURL (payments)' => function_exists('curl_init'),
    'OpenSSL (mailbox)' => extension_loaded('openssl'),
    'fileinfo (file types)' => class_exists('finfo'),
    'mbstring' => function_exists('mb_substr'),
    'app_key set' => strlen((string)config('app_key')) >= 32,
];
$list = '<ul>' . implode('', array_map(fn($k, $ok) => '<li>' . ($ok ? '✅' : '❌') . ' ' . $h($k) . '</li>', array_keys($checks), $checks)) . '</ul>';
if (!$checks['Database connection']) page($list . '<p>Fix the database details in phomi-config.php, then reload this page.</p>');

install_schema();
$uploads = uploads_ready(date('Y/m'));
$hasAdmin = (int)(row('SELECT COUNT(*) AS n FROM admins')['n'] ?? 0) > 0;

if ($hasAdmin) page($list . '<p>✅ Tables are up to date. An admin account already exists, so this page does nothing more.</p><p><a href="/admin">Go to the admin page</a></p>');

$err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = strtolower(trim((string)($_POST['email'] ?? '')));
    $pass = (string)($_POST['password'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $err = 'Enter a valid email.';
    elseif (strlen($pass) < 10) $err = 'Use a password of at least 10 characters.';
    else {
        insert('admins', ['email' => $email, 'name' => trim((string)($_POST['name'] ?? '')), 'password_hash' => password_hash($pass, PASSWORD_DEFAULT), 'created_at' => now()]);
        // The first admin is also an approved sender and gets the alerts
        if (!row('SELECT id FROM senders WHERE email = ?', [$email])) insert('senders', ['email' => $email, 'name' => trim((string)($_POST['name'] ?? '')), 'created_at' => now()]);
        setting_set('notify_email', $email);
        page($list . '<p>✅ All set. Your admin account is ready.</p><p><a href="/admin">Sign in to the admin page</a></p><p style="color:#6b5e4f">For safety you can now remove install_token from phomi-config.php.</p>');
    }
}
page($list . ($err ? '<p style="color:#A03207">' . $h($err) . '</p>' : '')
    . '<p>Create the first admin account:</p><form method="post" style="display:grid;gap:12px">'
    . '<input type="hidden" name="token" value="' . $h($token) . '">'
    . '<label>Name<br><input name="name" style="width:100%;padding:10px" autocomplete="name"></label>'
    . '<label>Email<br><input name="email" type="email" required style="width:100%;padding:10px" autocomplete="username"></label>'
    . '<label>Password (10+ characters)<br><input name="password" type="password" required minlength="10" style="width:100%;padding:10px" autocomplete="new-password"></label>'
    . '<button style="padding:14px;border:0;border-radius:8px;background:#A03207;color:#fff;font-size:16px">Create account</button></form>');
