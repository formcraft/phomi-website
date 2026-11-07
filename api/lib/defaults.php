<?php
// Default settings. Real values go in phomi-config.php (see api/config.sample.php).
return [
    'debug' => false,
    'timezone' => 'Africa/Kampala',
    'site_url' => 'https://pottershouseoutreachministriesinternational.com',
    'app_key' => '', // 32+ random characters, used to encrypt saved passwords

    // MySQL database (hPanel → Databases → MySQL Databases)
    'db' => [
        'dsn' => '', // e.g. mysql:host=localhost;dbname=u123_phomi;charset=utf8mb4
        'user' => '',
        'pass' => '',
    ],

    // One-time setup link: /api/install.php?token=<install_token>
    'install_token' => '',

    // Secret used by the cron URL if the host can't run PHP from the command line
    'cron_token' => '',

    // Where uploaded photos, audio and video are stored (inside public_html)
    'uploads_dir' => dirname(__DIR__, 2) . '/uploads',
    'uploads_url' => '/uploads',
    'max_upload_mb' => 64,

    // Mobile Money provider: 'yo', 'flutterwave', 'mock' (local testing only) or '' (off)
    'payments' => [
        'provider' => '',
        'yo' => [
            'username' => '',
            'password' => '',
            'endpoint' => 'https://paymentsapi1.yo.co.ug/ybs/task.php',
            'ipn_secret' => '', // added to the notification URL so only Yo can call it
        ],
        'flutterwave' => [
            'secret_key' => '',
            'secret_hash' => '', // the "Secret hash" set under Settings → Webhooks
            'endpoint' => 'https://api.flutterwave.com/v3',
            'receipt_email' => '', // Flutterwave requires an email; used when the giver leaves it blank
        ],
        'min' => 500,
        'max' => 5000000,
    ],


    // Verse of the Day by SMS (optional, paid per message): 'africastalking', 'mock' (local testing only) or '' (off)
    'sms' => [
        'provider' => '',
        'username' => '',   // Africa's Talking app username ('sandbox' for testing)
        'api_key' => '',
        'sender_id' => '',  // approved sender name, e.g. PHOMI; leave blank to use the shared number
        'sandbox' => false,
    ],

    // Verse emails: most the mail server may send per hour (Hostinger plans allow roughly 100–300; check yours)
    'letters_per_hour' => 100,

    // Sender for replies and alerts. Hostinger mail works with PHP mail() when this is a mailbox on the domain.
    'mail_from' => 'church@pottershouseoutreachministriesinternational.com',
];
