<?php
declare(strict_types=1);

// Mobile Money giving. The giver types their number, the provider sends a PIN prompt to that phone,
// and the page waits until the provider says the payment went through.

const FUNDS = ['tithe' => 'Tithe & Offering', 'outreach' => 'Outreach & Care', 'bible-study' => 'Bible Study'];

function payment_provider(): ?string
{
    $p = (string)(config('payments')['provider'] ?? '');
    if ($p === 'mock' && !config('debug')) return null; // the test provider never runs on the live site
    return in_array($p, ['yo', 'flutterwave', 'mock'], true) ? $p : null;
}

// Accepts 0772..., 772..., +256772..., 256772... and returns 256772123456.
function normalize_phone(string $raw): ?string
{
    $d = preg_replace('/\D/', '', $raw);
    if (strlen($d) === 10 && $d[0] === '0') $d = '256' . substr($d, 1);
    elseif (strlen($d) === 9) $d = '256' . $d;
    if (!preg_match('/^2567\d{8}$/', $d)) return null;
    return $d;
}

function phone_network(string $msisdn): ?string
{
    $p = substr($msisdn, 3, 2);
    if (in_array($p, ['76', '77', '78', '79'], true)) return 'MTN';
    if (in_array($p, ['70', '74', '75'], true)) return 'AIRTEL';
    return null;
}

function give_start(array $in): array
{
    $provider = payment_provider();
    if (!$provider) throw new ApiError(503, 'Phone prompts are not switched on yet.', ['fallback' => 'ussd']);

    $cfg = config('payments');
    $amount = (int)preg_replace('/\D/', '', (string)($in['amount'] ?? ''));
    if ($amount < $cfg['min']) throw new ApiError(422, 'The smallest gift by Mobile Money is UGX ' . number_format($cfg['min']) . '.');
    if ($amount > $cfg['max']) throw new ApiError(422, 'For gifts above UGX ' . number_format($cfg['max']) . ' please use bank transfer.');
    $fund = (string)($in['fund'] ?? 'tithe');
    if (!isset(FUNDS[$fund])) $fund = 'tithe';
    $phone = normalize_phone((string)($in['phone'] ?? ''));
    if (!$phone) throw new ApiError(422, 'Enter your Mobile Money number, for example 0772 123456.');
    $network = strtoupper((string)($in['network'] ?? ''));
    $guess = phone_network($phone);
    if (!$guess) throw new ApiError(422, 'That number is not an MTN or Airtel Mobile Money number.');
    if (!in_array($network, ['MTN', 'AIRTEL'], true)) $network = $guess ?? '';
    if (!$network) throw new ApiError(422, 'Choose MTN or Airtel.');
    if ($guess && $guess !== $network) {
        $nice = $guess === 'MTN' ? 'MTN' : 'Airtel';
        throw new ApiError(422, "That looks like an $nice number. Choose $nice, or check the number.");
    }

    rate_limit('give:' . client_ip(), 6, 10);
    rate_limit('give:' . $phone, 3, 10);

    $ref = 'PHOMI-' . date('ymd') . '-' . strtoupper(substr(random_token(5), 0, 8));
    $gift = [
        'ref' => $ref, 'provider' => $provider, 'network' => $network, 'phone' => $phone, 'amount' => $amount,
        'fund' => $fund, 'name' => str_in($in, 'name', 120), 'email' => strtolower(str_in($in, 'email', 190)),
        'status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
    ];
    if ($gift['email'] !== '' && !filter_var($gift['email'], FILTER_VALIDATE_EMAIL)) $gift['email'] = '';
    insert('gifts', $gift);

    try {
        $res = match ($provider) {
            'yo' => yo_start($gift),
            'flutterwave' => flw_start($gift),
            'mock' => ['provider_ref' => 'MOCK-' . $ref, 'status' => 'pending'],
        };
    } catch (ApiError $e) {
        gift_mark($ref, 'failed', '', $e->getMessage());
        throw $e;
    }
    gift_mark($ref, $res['status'], $res['provider_ref'] ?? '', $res['message'] ?? '');
    return ['ref' => $ref, 'status' => $res['status'], 'redirect' => $res['redirect'] ?? null, 'message' => $res['message'] ?? ''];
}

function give_status(string $ref): array
{
    $g = row('SELECT * FROM gifts WHERE ref = ?', [$ref]);
    if (!$g) throw new ApiError(404, 'We could not find that gift.');
    if ($g['status'] === 'pending' && strtotime($g['updated_at']) <= time() - 3) {
        gift_refresh($g);
        $g = row('SELECT * FROM gifts WHERE ref = ?', [$ref]);
    }
    // Give up waiting after 10 minutes; the provider will have cancelled the prompt by then
    if ($g['status'] === 'pending' && strtotime($g['created_at']) < time() - 600) {
        gift_mark($ref, 'failed', $g['provider_ref'], 'The prompt timed out.');
        $g['status'] = 'failed';
        $g['message'] = 'The prompt timed out.';
    }
    return [
        'ref' => $g['ref'], 'status' => $g['status'], 'amount' => (int)$g['amount'],
        'fund' => FUNDS[$g['fund']] ?? $g['fund'], 'network' => $g['network'], 'message' => $g['message'],
    ];
}

function gift_refresh(array $g): void
{
    try {
        $res = match ($g['provider']) {
            'yo' => yo_check($g),
            'flutterwave' => flw_check($g),
            'mock' => strtotime($g['created_at']) <= time() - 6
                ? ['status' => $g['amount'] == 13 ? 'failed' : 'successful', 'message' => $g['amount'] == 13 ? 'Not enough balance (test).' : '']
                : ['status' => 'pending'],
            default => ['status' => 'pending'],
        };
    } catch (ApiError $e) {
        q('UPDATE gifts SET updated_at = ? WHERE id = ?', [now(), $g['id']]);
        return;
    }
    gift_mark($g['ref'], $res['status'], $res['provider_ref'] ?? $g['provider_ref'], $res['message'] ?? '');
}

function gift_mark(string $ref, string $status, string $providerRef, string $message): void
{
    $before = row('SELECT status FROM gifts WHERE ref = ?', [$ref]);
    // Final states never change back, except failed → successful if the provider confirms late
    if ($before && $before['status'] !== 'pending' && !($before['status'] === 'failed' && $status === 'successful')) return;
    q('UPDATE gifts SET status = ?, provider_ref = ?, message = ?, updated_at = ? WHERE ref = ?',
        [$status, $providerRef, mb_substr($message, 0, 300), now(), $ref]);
    if ($status === 'successful' && ($before['status'] ?? '') !== 'successful') {
        $g = row('SELECT * FROM gifts WHERE ref = ?', [$ref]);
        notify_admins(
            'New gift: UGX ' . number_format((int)$g['amount']) . ' for ' . (FUNDS[$g['fund']] ?? $g['fund']),
            "A gift has been received on the website.\n\nAmount: UGX " . number_format((int)$g['amount']) .
            "\nFund: " . (FUNDS[$g['fund']] ?? $g['fund']) . "\nNetwork: {$g['network']}\nPhone: {$g['phone']}" .
            "\nName: " . ($g['name'] ?: '(not given)') . "\nReference: {$g['ref']}\nProvider reference: {$g['provider_ref']}\n"
        );
    }
}

// ---------- Yo! Payments (Uganda) ----------
// Docs: Yo! Payments Business API, methods acdepositfunds and actransactioncheckstatus.

function yo_call(string $method, array $fields): array
{
    $c = config('payments')['yo'];
    if (empty($c['username']) || empty($c['password'])) throw new ApiError(503, 'Yo! Payments is not set up yet.');
    $xml = new SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><AutoCreate/>');
    $r = $xml->addChild('Request');
    $r->addChild('APIUsername', htmlspecialchars($c['username'], ENT_XML1));
    $r->addChild('APIPassword', htmlspecialchars($c['password'], ENT_XML1));
    $r->addChild('Method', $method);
    foreach ($fields as $k => $v) $r->addChild($k, htmlspecialchars((string)$v, ENT_XML1));
    [$code, $resp] = http_request('POST', $c['endpoint'], ['Content-Type: text/xml', 'Content-transfer-encoding: text'], $xml->asXML());
    $doc = @simplexml_load_string($resp);
    if (!$doc || !isset($doc->Response)) throw new ApiError(502, 'The payment service gave an unexpected answer.');
    return json_decode(json_encode($doc->Response), true) ?: [];
}

function yo_start(array $g): array
{
    $secret = (string)(config('payments')['yo']['ipn_secret'] ?? '');
    $r = yo_call('acdepositfunds', [
        'NonBlocking' => 'TRUE',
        'Amount' => $g['amount'],
        'Account' => $g['phone'],
        'Narrative' => 'Gift to PHOMI: ' . (FUNDS[$g['fund']] ?? $g['fund']),
        'ExternalReference' => $g['ref'],
        'ProviderReferenceText' => 'PHOMI gift',
        'InstantNotificationUrl' => site_url('/api/webhook/yo?s=' . urlencode($secret)),
        'FailureNotificationUrl' => site_url('/api/webhook/yo?s=' . urlencode($secret)),
    ]);
    if (($r['Status'] ?? '') !== 'OK') {
        throw new ApiError(502, yo_message($r) ?: 'The payment could not be started. Please try again.');
    }
    return ['status' => yo_status($r), 'provider_ref' => (string)($r['TransactionReference'] ?? '')];
}

function yo_check(array $g): array
{
    $fields = $g['provider_ref'] ? ['TransactionReference' => $g['provider_ref']] : ['PrivateTransactionReference' => $g['ref']];
    $r = yo_call('actransactioncheckstatus', $fields);
    if (($r['Status'] ?? '') !== 'OK') return ['status' => 'pending'];
    return ['status' => yo_status($r), 'message' => yo_message($r)];
}

function yo_status(array $r): string
{
    $t = strtoupper((string)($r['TransactionStatus'] ?? ''));
    if ($t === 'SUCCEEDED') return 'successful';
    if ($t === 'FAILED') return 'failed';
    return 'pending';
}

function yo_message(array $r): string
{
    foreach (['ErrorMessage', 'StatusMessage'] as $k) {
        if (!empty($r[$k]) && is_string($r[$k])) return $r[$k];
    }
    return '';
}

// ---------- Flutterwave ----------

function flw_call(string $method, string $path, ?array $body = null): array
{
    $c = config('payments')['flutterwave'];
    if (empty($c['secret_key'])) throw new ApiError(503, 'Flutterwave is not set up yet.');
    [$code, $resp] = http_request($method, rtrim($c['endpoint'], '/') . $path,
        ['Authorization: Bearer ' . $c['secret_key'], 'Content-Type: application/json'],
        $body === null ? null : json_encode($body));
    $j = json_decode($resp, true);
    if (!is_array($j)) throw new ApiError(502, 'The payment service gave an unexpected answer.');
    return $j + ['_http' => $code];
}

function flw_start(array $g): array
{
    $c = config('payments')['flutterwave'];
    $r = flw_call('POST', '/charges?type=mobile_money_uganda', [
        'tx_ref' => $g['ref'],
        'amount' => $g['amount'],
        'currency' => 'UGX',
        'network' => $g['network'],
        'phone_number' => $g['phone'],
        'email' => $g['email'] ?: ($c['receipt_email'] ?: config('mail_from')),
        'fullname' => $g['name'] ?: 'PHOMI giver',
        'redirect_url' => site_url('/give?ref=' . urlencode($g['ref'])),
    ]);
    if (($r['status'] ?? '') !== 'success') throw new ApiError(502, (string)($r['message'] ?? 'The payment could not be started.'));
    $redirect = $r['meta']['authorization']['redirect'] ?? null;
    return ['status' => 'pending', 'provider_ref' => (string)($r['data']['flw_ref'] ?? ''), 'redirect' => $redirect];
}

function flw_check(array $g): array
{
    $r = flw_call('GET', '/transactions/verify_by_reference?tx_ref=' . urlencode($g['ref']));
    $d = $r['data'] ?? null;
    if (($r['status'] ?? '') !== 'success' || !is_array($d)) return ['status' => 'pending'];
    $s = strtolower((string)($d['status'] ?? ''));
    if ($s === 'successful') {
        // Only count it if the amount and currency match what we asked for
        if ((int)$d['amount'] < (int)$g['amount'] || strtoupper((string)$d['currency']) !== 'UGX') {
            return ['status' => 'failed', 'message' => 'Amount did not match.', 'provider_ref' => (string)($d['flw_ref'] ?? '')];
        }
        return ['status' => 'successful', 'provider_ref' => (string)($d['flw_ref'] ?? '')];
    }
    if ($s === 'failed') return ['status' => 'failed', 'message' => (string)($d['processor_response'] ?? '')];
    return ['status' => 'pending'];
}

// Provider callbacks. We never trust the callback body: we look the payment up again with the provider.
function webhook(string $provider): array
{
    if ($provider === 'flutterwave') {
        $hash = (string)(config('payments')['flutterwave']['secret_hash'] ?? '');
        if ($hash === '' || !hash_equals($hash, (string)($_SERVER['HTTP_VERIF_HASH'] ?? ''))) throw new ApiError(401, 'Bad signature.');
        $j = json_decode(file_get_contents('php://input') ?: '', true) ?: [];
        $ref = (string)($j['data']['tx_ref'] ?? $j['txRef'] ?? '');
    } elseif ($provider === 'yo') {
        $secret = (string)(config('payments')['yo']['ipn_secret'] ?? '');
        if ($secret === '' || !hash_equals($secret, (string)($_GET['s'] ?? ''))) throw new ApiError(401, 'Bad signature.');
        $ref = (string)($_POST['external_ref'] ?? $_POST['failed_transaction_reference'] ?? '');
    } else {
        throw new ApiError(404, 'Unknown provider.');
    }
    $g = $ref ? row('SELECT * FROM gifts WHERE ref = ? OR provider_ref = ?', [$ref, $ref]) : null;
    if ($g) gift_refresh($g);
    return ['ok' => true];
}
