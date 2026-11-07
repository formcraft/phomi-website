<?php
// Reads the church update mailbox and publishes what people sent.
// Hostinger: hPanel → Advanced → Cron Jobs → every 5 minutes, command:
//   /usr/bin/php /home/<user>/domains/<domain>/public_html/api/cron/inbox.php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Run this from the command line, or use /api/cron/inbox?token=...');
}
require dirname(__DIR__) . '/lib/bootstrap.php';

$lock = fopen(sys_get_temp_dir() . '/phomi-inbox.lock', 'c');
if (!flock($lock, LOCK_EX | LOCK_NB)) exit("Already running\n");

try {
    $r = ingest_run();
    echo date('c') . ' ' . json_encode(['ok' => $r['ok'], 'processed' => $r['processed'] ?? 0, 'message' => $r['message'] ?? '']) . "\n";
} catch (Throwable $e) {
    fwrite(STDERR, date('c') . ' inbox failed: ' . $e->getMessage() . "\n");
    exit(1);
}
