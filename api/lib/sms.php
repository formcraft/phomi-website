<?php
declare(strict_types=1);

// Verse of the Day by SMS. Sending SMS automatically needs a paid bulk-SMS account (Africa's Talking works in Uganda).
// Without one, the contact list still works: the admin page can copy the numbers, and anyone can send a verse
// from their own phone with the "Send to a number" buttons on the website (free, uses their own airtime).

function sms_provider(): string
{
    $p = (string)(config('sms')['provider'] ?? '');
    if ($p === 'mock' && !config('debug')) return '';
    return in_array($p, ['africastalking', 'mock'], true) ? $p : '';
}

// Ugandan numbers in any common form → +2567XXXXXXXX. Numbers abroad must start with + or 00.
function sms_phone(string $raw): ?string
{
    $raw = trim($raw);
    $d = preg_replace('/\D/', '', $raw);
    if (preg_match('/^(\+|00)/', $raw) && !str_starts_with($d, '256')) {
        $d = preg_replace('/^00/', '', $d);
        return strlen($d) >= 8 && strlen($d) <= 15 ? '+' . $d : null;
    }
    $u = normalize_phone($raw);
    return $u ? '+' . $u : null;
}

// Sends one message to many numbers. Returns how many were accepted.
function sms_send(array $phones, string $message): int
{
    $phones = array_values(array_unique(array_filter($phones)));
    if (!$phones) return 0;
    $p = sms_provider();
    if ($p === '') throw new ApiError(503, 'SMS sending is not set up. Add an SMS account in phomi-config.php (see the setup guide).');
    if ($p === 'mock') {
        file_put_contents((string)(config('sms')['log'] ?? config('mail_log')), 'SMS to ' . implode(',', $phones) . "\n$message\n----\n", FILE_APPEND);
        return count($phones);
    }
    $c = config('sms');
    $url = !empty($c['sandbox']) ? 'https://api.sandbox.africastalking.com/version1/messaging' : 'https://api.africastalking.com/version1/messaging';
    $sent = 0;
    foreach (array_chunk($phones, 500) as $chunk) {
        $form = ['username' => (string)$c['username'], 'to' => implode(',', $chunk), 'message' => $message];
        if (!empty($c['sender_id'])) $form['from'] = (string)$c['sender_id'];
        [$code, $body] = http_request('POST', $url, ['apiKey: ' . $c['api_key'], 'Accept: application/json', 'Content-Type: application/x-www-form-urlencoded'], http_build_query($form), 60);
        $r = json_decode($body, true);
        if ($code >= 300 || !is_array($r)) throw new ApiError(502, 'The SMS service refused the message: ' . mb_substr(trim(strip_tags($body)), 0, 200));
        foreach ($r['SMSMessageData']['Recipients'] ?? [] as $rec) if (($rec['status'] ?? '') === 'Success') $sent++;
    }
    return $sent;
}

function sms_verse_text(array $v): string
{
    $label = ($v['translation'] ?? '') === 'lug' ? 'Ekyawandiikibwa kya Leero' : 'Verse of the Day';
    $t = "$label: \"{$v['text']}\" {$v['ref']} - Potter's House";
    if (mb_strlen($t) > 459) { // keep it to three SMS parts at most
        $t = "$label: \"" . mb_substr($v['text'], 0, 380) . "…\" {$v['ref']} - Potter's House";
    }
    return $t;
}

// Daily SMS: one 'sms' letter per day, sent in batches by the 5-minute job like the emails.
function sms_tick(): int
{
    if (setting('sms_on') !== '1' || sms_provider() === '') return 0;
    $sent = 0;
    foreach (rows("SELECT * FROM letters WHERE kind = 'sms' AND status IN ('scheduled', 'sending') AND send_after <= ? ORDER BY for_date", [now()]) as $l) {
        q("UPDATE letters SET status = 'sending' WHERE id = ?", [$l['id']]);
        // People who signed up in Luganda get the verse from the Luganda Bible
        $msg = ['en' => sms_verse_text(verse_for($l['for_date'], 'day')), 'lg' => sms_verse_text(verse_for($l['for_date'], 'day', 'lug'))];
        $batch = rows("SELECT id, phone, lang FROM sms_contacts WHERE status = 'active' AND daily = 1 AND id > ? ORDER BY id LIMIT 500", [(int)$l['cursor_id']]);
        if ($batch) {
            foreach (['en', 'lg'] as $lang) {
                $phones = array_column(array_filter($batch, fn($c) => ($c['lang'] === 'lg' ? 'lg' : 'en') === $lang), 'phone');
                if ($phones) $sent += sms_send($phones, $msg[$lang]);
            }
            q('UPDATE letters SET cursor_id = ?, sent_count = sent_count + ? WHERE id = ?', [end($batch)['id'], count($batch), $l['id']]);
        }
        if (count($batch) < 500) q("UPDATE letters SET status = 'sent', sent_at = ? WHERE id = ?", [now(), $l['id']]);
    }
    return $sent;
}
