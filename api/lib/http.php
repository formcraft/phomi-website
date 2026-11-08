<?php
declare(strict_types=1);

class ApiError extends Exception
{
    public function __construct(public int $status, string $message, public array $extra = [])
    {
        parent::__construct($message);
    }
}

function json_out($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

function body(): array
{
    static $data = null;
    if ($data !== null) return $data;
    $type = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains($type, 'application/json')) {
        $data = json_decode(file_get_contents('php://input') ?: '[]', true) ?: [];
    } else {
        $data = $_POST;
    }
    return $data;
}

function str_in(array $src, string $key, int $max = 500): string
{
    $v = $src[$key] ?? '';
    if (!is_scalar($v)) return '';
    $v = trim((string)$v);
    return mb_substr($v, 0, $max);
}

function client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

// Allows $max hits per $minutes for a bucket (e.g. "give:1.2.3.4").
function rate_limit(string $bucket, int $max, int $minutes): void
{
    $since = date('Y-m-d H:i:s', time() - $minutes * 60);
    $n = (int)(row('SELECT COUNT(*) AS n FROM hits WHERE bucket = ? AND created_at > ?', [$bucket, $since])['n'] ?? 0);
    if ($n >= $max) throw new ApiError(429, 'Too many tries. Please wait a few minutes and try again.');
    insert('hits', ['bucket' => $bucket, 'created_at' => now()]);
    if (random_int(1, 50) === 1) q('DELETE FROM hits WHERE created_at < ?', [date('Y-m-d H:i:s', time() - 86400)]);
}

function http_request(string $method, string $url, array $headers = [], ?string $body = null, int $timeout = 30): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_HTTPHEADER => $headers,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($resp === false) throw new ApiError(502, 'Could not reach the payment service: ' . $err);
    return [$code, (string)$resp];
}

function random_token(int $bytes = 16): string
{
    return bin2hex(random_bytes($bytes));
}

function site_url(string $path = ''): string
{
    return rtrim((string)config('site_url'), '/') . $path;
}
