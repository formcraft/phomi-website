<?php
declare(strict_types=1);

const MEDIA_TYPES = [
    'image/jpeg' => ['image', 'jpg'],
    'image/png' => ['image', 'jpg'],
    'image/webp' => ['image', 'jpg'],
    'image/heic' => ['image', 'jpg'],
    'image/heif' => ['image', 'jpg'],
    'audio/mpeg' => ['audio', 'mp3'],
    'audio/mp3' => ['audio', 'mp3'],
    'audio/mp4' => ['audio', 'm4a'],
    'audio/x-m4a' => ['audio', 'm4a'],
    'audio/aac' => ['audio', 'aac'],
    'audio/ogg' => ['audio', 'ogg'],
    'audio/wav' => ['audio', 'wav'],
    'audio/x-wav' => ['audio', 'wav'],
    'video/mp4' => ['video', 'mp4'],
    'video/quicktime' => ['video', 'mov'],
    'video/webm' => ['video', 'webm'],
    'application/pdf' => ['document', 'pdf'],
];

function detect_mime(string $bytes, string $fallback = ''): string
{
    $f = new finfo(FILEINFO_MIME_TYPE);
    $m = (string)$f->buffer($bytes);
    if ($m === 'application/octet-stream' || $m === '') $m = strtolower($fallback);
    if ($m === 'video/mp4' && $fallback && str_starts_with(strtolower($fallback), 'audio/')) $m = 'audio/mp4';
    return $m;
}

function uploads_ready(string $sub): string
{
    $root = rtrim((string)config('uploads_dir'), '/');
    if (!is_dir($root)) mkdir($root, 0755, true);
    // Never run scripts from the uploads folder
    $ht = "$root/.htaccess";
    if (!is_file($ht)) {
        file_put_contents($ht, "Options -Indexes -ExecCGI\nRemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phar\n<FilesMatch \"\\.(php|phtml|phar|pl|py|cgi|sh)$\">\n  Require all denied\n</FilesMatch>\n<IfModule mod_headers.c>\n  Header set Cache-Control \"public, max-age=2592000\"\n  Header set X-Content-Type-Options \"nosniff\"\n</IfModule>\n");
    }
    $dir = "$root/$sub";
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    return $dir;
}

// Saves a file and returns ['kind' => image|audio|video|document, 'url' => ..., 'thumb' => ...]
function store_media(string $bytes, string $origName, string $mimeHint = ''): array
{
    $max = (int)config('max_upload_mb', 64) * 1024 * 1024;
    if (strlen($bytes) === 0) throw new ApiError(422, 'The file is empty.');
    if (strlen($bytes) > $max) throw new ApiError(413, 'That file is larger than ' . config('max_upload_mb', 64) . ' MB.');
    $mime = detect_mime($bytes, $mimeHint);
    if (!isset(MEDIA_TYPES[$mime])) throw new ApiError(415, "This kind of file ($mime) can't be added. Send photos as JPG or PNG, audio as MP3 and video as MP4.");
    [$kind, $ext] = MEDIA_TYPES[$mime];

    $sub = date('Y/m');
    $dir = uploads_ready($sub);
    $base = slugify(pathinfo($origName, PATHINFO_FILENAME)) ?: $kind;
    $name = substr($base, 0, 40) . '-' . substr(random_token(4), 0, 6);
    $url = rtrim((string)config('uploads_url'), '/') . "/$sub/";

    if ($kind === 'image') {
        [$full, $thumb] = enhance_image($bytes, $mime);
        file_put_contents("$dir/$name.jpg", $full);
        file_put_contents("$dir/$name-sm.jpg", $thumb);
        return ['kind' => 'image', 'url' => "$url$name.jpg", 'thumb' => "$url$name-sm.jpg"];
    }
    file_put_contents("$dir/$name.$ext", $bytes);
    return ['kind' => $kind, 'url' => "$url$name.$ext", 'thumb' => ''];
}

function slugify(string $s): string
{
    $s = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $s), '-'));
    return $s;
}

// Light, natural editing: upright, sized for 1080p screens, a touch more contrast and sharpness.
function enhance_image(string $bytes, string $mime): array
{
    if (in_array($mime, ['image/heic', 'image/heif'], true)) {
        if (!class_exists('Imagick')) throw new ApiError(415, 'iPhone HEIC photos need converting. Please send them as JPG (Settings → Camera → Formats → Most Compatible).');
        $im = new Imagick();
        $im->readImageBlob($bytes);
        $im->setImageFormat('jpeg');
        $bytes = $im->getImageBlob();
        $mime = 'image/jpeg';
    }
    if (!function_exists('imagecreatefromstring')) throw new ApiError(500, 'The GD image library is not enabled on the server.');
    $src = @imagecreatefromstring($bytes);
    if (!$src) throw new ApiError(415, 'That photo could not be opened.');

    if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
        $exif = @exif_read_data('data://image/jpeg;base64,' . base64_encode($bytes));
        $o = (int)($exif['Orientation'] ?? 1);
        $angle = [3 => 180, 6 => -90, 8 => 90][$o] ?? 0;
        if ($angle) $src = imagerotate($src, $angle, 0);
    }

    $full = resize_to($src, 1920);
    imagefilter($full, IMG_FILTER_CONTRAST, -6);
    imageconvolution($full, [[0, -1, 0], [-1, 20, -1], [0, -1, 0]], 16, 0);
    $thumb = resize_to($full, 720);

    return [jpeg_bytes($full, 84), jpeg_bytes($thumb, 80)];
}

function resize_to(GdImage $img, int $longSide): GdImage
{
    $w = imagesx($img);
    $h = imagesy($img);
    $scale = min(1, $longSide / max($w, $h));
    $nw = max(1, (int)round($w * $scale));
    $nh = max(1, (int)round($h * $scale));
    $out = imagecreatetruecolor($nw, $nh);
    imagefill($out, 0, 0, imagecolorallocate($out, 255, 255, 255));
    imagecopyresampled($out, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
    return $out;
}

function jpeg_bytes(GdImage $img, int $quality): string
{
    imageinterlace($img, true);
    ob_start();
    imagejpeg($img, null, $quality);
    return (string)ob_get_clean();
}

function delete_media(string $url): void
{
    $prefix = rtrim((string)config('uploads_url'), '/') . '/';
    if (!str_starts_with($url, $prefix)) return;
    $rel = substr($url, strlen($prefix));
    if (str_contains($rel, '..')) return;
    $root = rtrim((string)config('uploads_dir'), '/');
    @unlink("$root/$rel");
    if (str_ends_with($rel, '.jpg')) @unlink("$root/" . substr($rel, 0, -4) . '-sm.jpg');
}

function thumb_of(string $url): string
{
    $prefix = rtrim((string)config('uploads_url'), '/') . '/';
    if (str_starts_with($url, $prefix) && str_ends_with($url, '.jpg') && !str_ends_with($url, '-sm.jpg')) {
        return substr($url, 0, -4) . '-sm.jpg';
    }
    return $url;
}
