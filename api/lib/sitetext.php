<?php
declare(strict_types=1);

// Admin → Site text: the church's own wording for any text on the site, in English and Luganda,
// with its font, size and colour. Blank means "use the built-in wording" (src/text.js).
// Only plain text and a short list of safe style values are stored, so nothing here can run as code.

const TEXT_FONTS = ['head', 'body', 'seal', 'Georgia', 'Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Times New Roman'];

function text_key_ok(string $k): bool
{
    return (bool)preg_match('/^[a-z][A-Za-z0-9_.-]*( [A-Za-z0-9_.-]+)*$/', $k) && strlen($k) <= 120;
}

function text_plain($v, int $max = 5000): string
{
    $v = str_replace("\r\n", "\n", (string)$v);
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    return mb_substr(trim($v), 0, $max);
}

function text_color($v): string
{
    $v = strtolower(trim((string)$v));
    return preg_match('/^#[0-9a-f]{6}$/', $v) ? $v : '';
}

// {font, size, color, weight, italic} → the same, with anything unsafe or unknown dropped
function text_style_clean($s): array
{
    if (is_string($s)) $s = json_decode($s, true);
    if (!is_array($s)) return [];
    $out = [];
    if (in_array($s['font'] ?? '', TEXT_FONTS, true)) $out['font'] = $s['font'];
    $size = (int)($s['size'] ?? 0);
    if ($size >= 10 && $size <= 96) $out['size'] = $size;
    if ($c = text_color($s['color'] ?? '')) $out['color'] = $c;
    if (in_array((int)($s['weight'] ?? 0), [400, 500, 600, 700], true)) $out['weight'] = (int)$s['weight'];
    if (!empty($s['italic'])) $out['italic'] = true;
    return $out;
}

function site_text_all(): array
{
    $out = [];
    try {
        foreach (rows('SELECT k, en, lg, style FROM site_text') as $r) {
            $out[$r['k']] = array_filter(['en' => (string)$r['en'], 'lg' => (string)$r['lg'], 'style' => text_style_clean($r['style'])], fn($v) => $v !== '' && $v !== []);
        }
    } catch (Throwable $e) {
        // table missing before the installer runs
    }
    return $out;
}

function site_text_save(array $b): array
{
    $k = (string)($b['k'] ?? '');
    if (!text_key_ok($k)) throw new ApiError(422, 'Unknown text.');
    $data = ['en' => text_plain($b['en'] ?? ''), 'lg' => text_plain($b['lg'] ?? ''), 'style' => json_encode(text_style_clean($b['style'] ?? []))];
    if ($data['style'] === '[]') $data['style'] = '';
    $old = row('SELECT * FROM site_text WHERE k = ?', [$k]);
    if ($data['en'] === '' && $data['lg'] === '' && $data['style'] === '') return site_text_reset($k);
    $data['updated_at'] = now();
    if ($old) {
        update('site_text', (int)$old['id'], $data);
        log_change('update', 'site_text', (int)$old['id'], array_intersect_key($old, $data), $data, "Changed the site text \"$k\"");
    } else {
        $id = insert('site_text', ['k' => $k] + $data);
        log_change('create', 'site_text', $id, null, ['k' => $k] + $data, "Changed the site text \"$k\"");
    }
    return ['ok' => true, 'text' => site_text_all()[$k] ?? []];
}

function site_text_reset(string $k): array
{
    $old = row('SELECT * FROM site_text WHERE k = ?', [$k]);
    if ($old) {
        q('DELETE FROM site_text WHERE id = ?', [$old['id']]);
        log_change('delete', 'site_text', (int)$old['id'], $old, null, "Put back the built-in wording for \"$k\"");
    }
    return ['ok' => true, 'text' => []];
}

// The whole-site look: heading and body fonts, main colours and text size
function site_theme_clean($v): string
{
    $s = is_string($v) ? json_decode($v, true) : $v;
    if (!is_array($s)) return '';
    $out = [];
    foreach (['head', 'body'] as $f) if (in_array($s[$f] ?? '', TEXT_FONTS, true)) $out[$f] = $s[$f];
    foreach (['text', 'heading', 'clay', 'gold', 'navy'] as $c) if ($x = text_color($s[$c] ?? '')) $out[$c] = $x;
    $scale = (int)($s['scale'] ?? 0);
    if ($scale >= 85 && $scale <= 130 && $scale !== 100) $out['scale'] = $scale;
    return $out ? json_encode($out) : '';
}
