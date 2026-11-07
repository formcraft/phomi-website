<?php
// Copy this file to phomi-config.php ONE FOLDER ABOVE public_html
// (e.g. /home/u123456789/domains/pottershouseoutreachministriesinternational.com/phomi-config.php)
// and fill in the values. Never commit the real file to GitHub.
return [
    'site_url' => 'https://pottershouseoutreachministriesinternational.com',
    'app_key' => 'PASTE-64-RANDOM-CHARACTERS-HERE',      // php -r "echo bin2hex(random_bytes(32));"
    'install_token' => 'PASTE-ANOTHER-RANDOM-STRING',     // used once for /api/install.php?token=...
    'cron_token' => 'PASTE-A-THIRD-RANDOM-STRING',        // only if you use the cron URL instead of the PHP command

    'db' => [
        'dsn' => 'mysql:host=localhost;dbname=u123456789_phomi;charset=utf8mb4',
        'user' => 'u123456789_phomi',
        'pass' => 'database-password',
    ],

    'mail_from' => 'church@pottershouseoutreachministriesinternational.com',

    'payments' => [
        'provider' => '', // 'yo' (recommended for a direct PIN prompt) or 'flutterwave'. Leave '' until the account is live.
        'yo' => [
            'username' => '',  // Yo! Payments API username
            'password' => '',  // Yo! Payments API password
            'ipn_secret' => '', // any random string
            // While testing, set 'endpoint' to the sandbox URL Yo! Payments gives you with your test account.
        ],
        'flutterwave' => [
            'secret_key' => '',  // FLWSECK-...
            'secret_hash' => '', // Settings → Webhooks → Secret hash
            'receipt_email' => 'church@pottershouseoutreachministriesinternational.com',
        ],
    ],

];
