<?php
declare(strict_types=1);

// A small email parser: enough for what phones and webmail send (text, HTML, photos, audio, video, PDFs).

function mime_parse(string $raw): array
{
    [$headers, $body] = mime_split($raw);
    $msg = [
        'headers' => $headers,
        'subject' => mime_decode_header($headers['subject'] ?? ''),
        'message_id' => trim($headers['message-id'] ?? ''),
        'date' => $headers['date'] ?? '',
        'text' => '',
        'html' => '',
        'attachments' => [],
    ];
    [$msg['from_name'], $msg['from_email']] = mime_address(mime_decode_header($headers['from'] ?? ''));
    mime_walk($headers, $body, $msg);
    if ($msg['text'] === '' && $msg['html'] !== '') $msg['text'] = html_to_text($msg['html']);
    $msg['text'] = trim(str_replace("\r\n", "\n", $msg['text']));
    if ($msg['message_id'] === '') $msg['message_id'] = '<' . sha1($raw) . '@phomi.local>';
    return $msg;
}

function mime_split(string $raw): array
{
    $pos = strpos($raw, "\r\n\r\n");
    $sep = 4;
    $alt = strpos($raw, "\n\n");
    if ($pos === false || ($alt !== false && $alt < $pos)) {
        $pos = $alt;
        $sep = 2;
    }
    if ($pos === false) return [mime_headers($raw), ''];
    return [mime_headers(substr($raw, 0, $pos)), substr($raw, $pos + $sep)];
}

function mime_headers(string $block): array
{
    $block = preg_replace("/\r?\n[ \t]+/", ' ', $block); // unfold
    $out = [];
    foreach (preg_split("/\r?\n/", $block) as $line) {
        $i = strpos($line, ':');
        if ($i === false) continue;
        $name = strtolower(trim(substr($line, 0, $i)));
        $val = trim(substr($line, $i + 1));
        if (!isset($out[$name])) $out[$name] = $val; // first one wins (Received etc. are not needed)
    }
    return $out;
}

function mime_decode_header(string $v): string
{
    if ($v === '' || !str_contains($v, '=?')) return $v;
    $d = @iconv_mime_decode($v, ICONV_MIME_DECODE_CONTINUE_ON_ERROR, 'UTF-8');
    return $d !== false ? $d : mb_decode_mimeheader($v);
}

// "Pastor John <john@example.com>" → ['Pastor John', 'john@example.com']
function mime_address(string $v): array
{
    if (preg_match('/^\s*"?([^"<]*?)"?\s*<([^>]+)>/', $v, $m)) return [trim($m[1]), strtolower(trim($m[2]))];
    return ['', strtolower(trim($v, " <>\t"))];
}

// "text/plain; charset=utf-8; name="a b.jpg"" → ['text/plain', ['charset' => 'utf-8', 'name' => 'a b.jpg']]
function mime_params(string $v): array
{
    $parts = preg_split('/;(?=(?:[^"]*"[^"]*")*[^"]*$)/', $v);
    $main = strtolower(trim(array_shift($parts)));
    $params = [];
    $continued = [];
    foreach ($parts as $p) {
        $i = strpos($p, '=');
        if ($i === false) continue;
        $k = strtolower(trim(substr($p, 0, $i)));
        $val = trim(trim(substr($p, $i + 1)), '"');
        if (preg_match('/^(\w+)\*(\d+)?\*?$/', $k, $m)) {
            // RFC 2231: filename*=UTF-8''photo%20one.jpg and filename*0*=...
            $continued[$m[1]][(int)($m[2] ?? 0)] = $val;
            continue;
        }
        $params[$k] = mime_decode_header($val);
    }
    foreach ($continued as $k => $chunks) {
        ksort($chunks);
        $joined = implode('', $chunks);
        if (preg_match("/^([\w-]+)'[^']*'(.*)$/", $joined, $m)) {
            $joined = rawurldecode($m[2]);
            if (strtoupper($m[1]) !== 'UTF-8') $joined = (string)@mb_convert_encoding($joined, 'UTF-8', $m[1]);
        } else {
            $joined = rawurldecode($joined);
        }
        $params[$k] = $joined;
    }
    return [$main, $params];
}

function mime_walk(array $headers, string $body, array &$msg, int $depth = 0): void
{
    if ($depth > 8) return;
    [$type, $params] = mime_params($headers['content-type'] ?? 'text/plain');
    if (str_starts_with($type, 'multipart/') && !empty($params['boundary'])) {
        $b = preg_quote($params['boundary'], '/');
        $chunks = preg_split("/\r?\n?--$b(?:--)?[ \t]*\r?\n?/", $body);
        array_shift($chunks); // preamble
        foreach ($chunks as $chunk) {
            if (trim($chunk) === '') continue;
            [$h, $b2] = mime_split($chunk);
            mime_walk($h, $b2, $msg, $depth + 1);
        }
        return;
    }
    $data = mime_decode_body($body, strtolower(trim($headers['content-transfer-encoding'] ?? '7bit')));
    [$disp, $dparams] = mime_params($headers['content-disposition'] ?? '');
    $filename = $dparams['filename'] ?? $params['name'] ?? '';
    $isText = in_array($type, ['text/plain', 'text/html'], true) && $disp !== 'attachment' && $filename === '';
    if ($isText) {
        $charset = strtoupper($params['charset'] ?? 'UTF-8');
        if ($charset !== 'UTF-8' && $charset !== 'US-ASCII') $data = (string)@mb_convert_encoding($data, 'UTF-8', $charset);
        if ($type === 'text/plain' && $msg['text'] === '') $msg['text'] = $data;
        if ($type === 'text/html' && $msg['html'] === '') $msg['html'] = $data;
        return;
    }
    if ($type === 'message/rfc822') {
        // A forwarded email: read its text and attachments too
        [$h, $b2] = mime_split($data);
        mime_walk($h, $b2, $msg, $depth + 1);
        return;
    }
    if ($data === '') return;
    $msg['attachments'][] = [
        'filename' => $filename ?: ('file-' . (count($msg['attachments']) + 1)),
        'mime' => $type,
        'bytes' => $data,
    ];
}

function mime_decode_body(string $body, string $enc): string
{
    return match ($enc) {
        'base64' => (string)base64_decode(preg_replace('/[^A-Za-z0-9+\/=]/', '', $body)),
        'quoted-printable' => quoted_printable_decode($body),
        default => $body,
    };
}

function html_to_text(string $html): string
{
    $html = preg_replace('#<(script|style)[^>]*>.*?</\1>#si', '', $html);
    $html = preg_replace('#<br\s*/?>|</p>|</div>|</li>|</h\d>#i', "\n", $html);
    $t = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $t = preg_replace("/[ \t]+/", ' ', $t);
    return trim(preg_replace("/\n\s*\n\s*\n+/", "\n\n", $t));
}

// Removes quoted replies and phone signatures so only the sender's own words are published.
function strip_reply(string $text): string
{
    $lines = explode("\n", $text);
    $out = [];
    foreach ($lines as $l) {
        if (preg_match('/^On .+ wrote:$/', trim($l)) || preg_match('/^-{2,}\s*Original Message/i', trim($l))) break;
        if (preg_match('/^(Sent from my|Get Outlook for)/i', trim($l))) break;
        if (trim($l) === '--') break;
        if (str_starts_with($l, '>')) continue;
        $out[] = $l;
    }
    return trim(implode("\n", $out));
}
