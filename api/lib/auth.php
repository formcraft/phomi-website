<?php
declare(strict_types=1);

function session_begin(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('phomi_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https',
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function current_admin(): ?array
{
    session_begin();
    $id = $_SESSION['admin_id'] ?? null;
    if (!$id) return null;
    // Sessions end after 12 hours of no use
    if (($_SESSION['seen'] ?? 0) < time() - 43200) {
        $_SESSION = [];
        return null;
    }
    $_SESSION['seen'] = time();
    return row('SELECT id, email, name FROM admins WHERE id = ?', [$id]);
}

// Admin calls must come from the site's own pages: they send this header, which other sites can't add.
function require_admin(): array
{
    if (($_SERVER['HTTP_X_PHOMI'] ?? '') !== '1') throw new ApiError(403, 'Missing request header.');
    $a = current_admin();
    if (!$a) throw new ApiError(401, 'Please sign in.');
    return $a;
}

function admin_login(string $email, string $password): array
{
    rate_limit('login:' . client_ip(), 8, 15);
    $a = row('SELECT * FROM admins WHERE email = ?', [strtolower($email)]);
    if (!$a || !password_verify($password, $a['password_hash'])) {
        throw new ApiError(401, 'That email and password do not match.');
    }
    session_begin();
    session_regenerate_id(true);
    $_SESSION['admin_id'] = (int)$a['id'];
    $_SESSION['seen'] = time();
    q('UPDATE admins SET last_login = ? WHERE id = ?', [now(), $a['id']]);
    return ['id' => (int)$a['id'], 'email' => $a['email'], 'name' => $a['name']];
}

function admin_logout(): void
{
    session_begin();
    $_SESSION = [];
    session_destroy();
}

function check_password(string $p): void
{
    if (strlen($p) < 10) throw new ApiError(422, 'Use a password of at least 10 characters.');
}
