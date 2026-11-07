<?php
// Sets up the local preview database: tables, the Bible text and a test admin.
// Run by scripts/local-server.mjs:  PHOMI_CONFIG=.local/config.php php scripts/local-seed.php <email> <password>
declare(strict_types=1);
require dirname(__DIR__) . '/api/lib/bootstrap.php';

install_schema();
if (!bible_ready()) bible_import();
[$email, $pass] = [$argv[1] ?? 'formcraftinc@gmail.com', $argv[2] ?? 'Potters-preview'];
if (!row('SELECT id FROM admins WHERE email = ?', [$email])) {
    insert('admins', ['email' => $email, 'name' => 'Local admin', 'password_hash' => password_hash($pass, PASSWORD_DEFAULT), 'created_at' => now()]);
    if (!row('SELECT id FROM senders WHERE email = ?', [$email])) insert('senders', ['email' => $email, 'name' => 'Local admin', 'created_at' => now()]);
    setting_set('notify_email', $email);
    setting_set('lists_email', 'private.list@phomi.local');
}
echo "ready\n";
