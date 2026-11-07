<?php
declare(strict_types=1);

function send_mail(string $to, string $subject, string $text, ?string $replyTo = null): bool
{
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
    $from = (string)config('mail_from');
    $subject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $headers = [
        "From: Potter's House Website <$from>",
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'Auto-Submitted: auto-replied',
        'X-PHOMI-Mailer: 1',
    ];
    if ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) $headers[] = "Reply-To: $replyTo";

    // Local testing: write mail to a file instead of sending it
    if ($log = config('mail_log')) {
        file_put_contents($log, "To: $to\nSubject: $subject\n" . implode("\n", $headers) . "\n\n$text\n----\n", FILE_APPEND);
        return true;
    }
    return mail($to, $subject, $text, implode("\r\n", $headers), '-f' . $from);
}

// A newsletter-style email with a plain-text and an HTML version (verse emails).
function send_mail_html(string $to, string $subject, string $text, string $html, array $extra = []): bool
{
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
    $from = (string)config('mail_from');
    $subject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $b = 'phomi-' . bin2hex(random_bytes(8));
    $headers = array_merge([
        "From: Potter's House <$from>",
        'MIME-Version: 1.0',
        "Content-Type: multipart/alternative; boundary=\"$b\"",
        'Auto-Submitted: auto-generated',
        'X-PHOMI-Mailer: 1',
    ], $extra);
    $body = "--$b\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text))
        . "--$b\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html))
        . "--$b--\r\n";
    if ($log = config('mail_log')) {
        file_put_contents($log, "To: $to\nSubject: $subject\n" . implode("\n", $headers) . "\n\n$text\n----\n", FILE_APPEND);
        return true;
    }
    return mail($to, $subject, $body, implode("\r\n", $headers), '-f' . $from);
}

function notify_admins(string $subject, string $text): void
{
    try {
        $to = setting('notify_email') ?: (string)config('mail_from');
    } catch (Throwable $e) {
        $to = (string)config('mail_from');
    }
    foreach (preg_split('/[\s,;]+/', $to) as $addr) {
        if ($addr) send_mail($addr, $subject, $text);
    }
}
