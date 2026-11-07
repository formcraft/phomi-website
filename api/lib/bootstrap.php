<?php
// Shared start-up for every API request and cron job.
declare(strict_types=1);

const PHOMI_API = true;

function config(?string $key = null, $default = null)
{
    static $cfg = null;
    if ($cfg === null) {
        $cfg = [];
        // The real config lives outside the web root when possible.
        $candidates = [
            getenv('PHOMI_CONFIG') ?: '',
            dirname(__DIR__, 3) . '/phomi-config.php', // /home/uXXX/domains/<site>/phomi-config.php
            dirname(__DIR__) . '/config.php',          // public_html/api/config.php (protected by .htaccess)
        ];
        foreach ($candidates as $file) {
            if ($file && is_file($file)) {
                $cfg = require $file;
                break;
            }
        }
        $cfg += require __DIR__ . '/defaults.php';
    }
    if ($key === null) return $cfg;
    return $cfg[$key] ?? $default;
}

if (config('debug')) {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
}
date_default_timezone_set(config('timezone', 'Africa/Kampala'));

require __DIR__ . '/db.php';
require __DIR__ . '/http.php';
require __DIR__ . '/settings.php';
require __DIR__ . '/history.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/media.php';
require __DIR__ . '/resources.php';
require __DIR__ . '/payments.php';
require __DIR__ . '/mailer.php';
require __DIR__ . '/mime.php';
require __DIR__ . '/imap.php';
require __DIR__ . '/ingest.php';
require __DIR__ . '/bible.php';
require __DIR__ . '/letters.php';
require __DIR__ . '/sms.php';
