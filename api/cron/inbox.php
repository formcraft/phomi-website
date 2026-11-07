<?php
// Reads the church update mailbox (updates wait for approval) and sends the verse emails.
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

$failed = false;
try {
    $r = ingest_run();
    echo date('c') . ' ' . json_encode(['ok' => $r['ok'], 'processed' => $r['processed'] ?? 0, 'message' => $r['message'] ?? '']) . "\n";
} catch (Throwable $e) {
    fwrite(STDERR, date('c') . ' inbox failed: ' . $e->getMessage() . "\n");
    $failed = true;
}
try {
    $l = letters_tick(); // the verse emails ride on the same 5-minute job
    if (!empty($l['sent'])) echo date('c') . " verse emails sent: {$l['sent']}\n";
} catch (Throwable $e) {
    fwrite(STDERR, date('c') . ' verse emails failed: ' . $e->getMessage() . "\n");
    $failed = true;
}
exit($failed ? 1 : 0);
