<?php
// Local test server that behaves like the Hostinger .htaccess rules:
//   PHOMI_CONFIG=/path/to/config.php php -S 127.0.0.1:8099 -t <web root> api/tests/router.php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($path === '/api/install.php') { require dirname(__DIR__) . '/install.php'; return true; }
if (str_starts_with($path, '/api/') || $path === '/api') { require dirname(__DIR__) . '/index.php'; return true; }
$file = $_SERVER['DOCUMENT_ROOT'] . $path;
if ($path !== '/' && is_file($file)) return false; // static files (built site, uploads)
if (str_starts_with($path, '/uploads/')) { http_response_code(404); return true; }
$index = $_SERVER['DOCUMENT_ROOT'] . '/index.html';
if (is_file($index)) { header('Content-Type: text/html; charset=utf-8'); readfile($index); return true; }
http_response_code(404);
return true;
