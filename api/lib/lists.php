<?php
declare(strict_types=1);

// The church's private copy of the email and phone lists.
// New sign-ups are reported to the private list address (Settings → Lists), and every Monday
// a copy of both lists is emailed there as spreadsheets. The address is never shown on the site.

function lists_email_to(): string
{
    return trim(setting('lists_email')) ?: trim(setting('notify_email'));
}

// A spreadsheet cell that can't run as a formula when opened in Excel or Google Sheets
function csv_cell($v): string
{
    $v = (string)$v;
    return preg_match('/^[=+\-@\t\r]/', $v) ? "'" . $v : $v;
}

function lists_csv(string $kind): string
{
    $f = fopen('php://temp', 'w+');
    if ($kind === 'phones') {
        fputcsv($f, ['phone', 'name', 'verse by SMS', 'please call', 'language', 'status', 'added']);
        foreach (rows('SELECT phone, name, daily, call_me, lang, status, created_at FROM sms_contacts ORDER BY id') as $r) {
            fputcsv($f, array_map('csv_cell', [$r['phone'], $r['name'], $r['daily'] ? 'yes' : 'no', $r['call_me'] ? 'yes' : 'no', $r['lang'] === 'lg' ? 'Luganda' : 'English', $r['status'], $r['created_at']]));
        }
    } else {
        fputcsv($f, ['email', 'name', 'daily verse', 'weekly letter', 'language', 'status', 'signed up', 'confirmed']);
        foreach (rows('SELECT email, name, daily, weekly, lang, status, created_at, confirmed_at FROM subscribers ORDER BY id') as $r) {
            fputcsv($f, array_map('csv_cell', [$r['email'], $r['name'], $r['daily'] ? 'yes' : 'no', $r['weekly'] ? 'yes' : 'no', $r['lang'] === 'lg' ? 'Luganda' : 'English', $r['status'], $r['created_at'], $r['confirmed_at'] ?? '']));
        }
    }
    rewind($f);
    $csv = stream_get_contents($f);
    fclose($f);
    return "\xEF\xBB\xBF" . $csv; // so Excel reads names with accents correctly
}

function lists_counts(): array
{
    return [
        'emails' => (int)(row("SELECT COUNT(*) AS n FROM subscribers WHERE status = 'active'")['n'] ?? 0),
        'pending' => (int)(row("SELECT COUNT(*) AS n FROM subscribers WHERE status = 'pending'")['n'] ?? 0),
        'phones' => (int)(row("SELECT COUNT(*) AS n FROM sms_contacts WHERE status = 'active'")['n'] ?? 0),
        'call' => (int)(row("SELECT COUNT(*) AS n FROM sms_contacts WHERE status = 'active' AND call_me = 1")['n'] ?? 0),
    ];
}

// Tell the private list address about one new sign-up
function lists_alert_signup(array $who): void
{
    $to = lists_email_to();
    if ($to === '') return;
    $lines = array_filter([
        $who['name'] ? 'Name: ' . $who['name'] : '',
        $who['email'] ? 'Email: ' . $who['email'] . ' (confirm email sent)' : '',
        $who['phone'] ? 'Phone: ' . $who['phone'] : '',
        $who['wants'] ? 'Wants: ' . implode(', ', $who['wants']) : '',
    ]);
    $call = in_array('a call from the church', $who['wants'], true);
    foreach (preg_split('/[\s,;]+/', $to) as $addr) {
        if ($addr) send_mail($addr, ($call ? 'Please call: ' : 'New sign-up: ') . ($who['name'] ?: ($who['phone'] ?: $who['email'])),
            "Someone signed up on the website.\n\n" . implode("\n", $lines) . "\n\nThe full lists are in Admin → Email list and Admin → Phone list.\n\nPotter's House website");
    }
}

// Email both lists to the private address. Returns what was sent.
function lists_send(string $why = 'weekly'): array
{
    $to = lists_email_to();
    if ($to === '') throw new ApiError(422, 'Add the private list address first in Settings → Lists and sign-ups.');
    $c = lists_counts();
    $date = date('Y-m-d');
    $text = "The Potter's House email and phone lists, $date.\n\n"
        . "Email list: {$c['emails']} confirmed" . ($c['pending'] ? ", {$c['pending']} not confirmed yet" : '') . "\n"
        . "Phone list: {$c['phones']} numbers, {$c['call']} asked for a call\n\n"
        . "Both lists are attached as spreadsheets. Please keep them private: only use them for church messages these people asked for.\n\nPotter's House website";
    $files = [
        ['name' => "phomi-email-list-$date.csv", 'type' => 'text/csv', 'data' => lists_csv('emails')],
        ['name' => "phomi-phone-list-$date.csv", 'type' => 'text/csv', 'data' => lists_csv('phones')],
    ];
    $n = 0;
    foreach (preg_split('/[\s,;]+/', $to) as $addr) {
        if ($addr && send_mail_files($addr, "Church email and phone lists ($date)", $text, $files)) $n++;
    }
    if ($why === 'weekly') setting_set('lists_sent_on', $date);
    return ['ok' => $n > 0, 'sent_to' => $n, 'counts' => $c];
}

// Called by the 5-minute cron job: once each Monday after 07:00
function lists_tick(): ?array
{
    if (setting('lists_weekly') !== '1' || lists_email_to() === '') return null;
    $monday = week_start(date('Y-m-d'));
    if (setting('lists_sent_on') >= $monday || date('H:i') < '07:00') return null;
    return lists_send('weekly');
}
