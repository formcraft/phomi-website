<?php
declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $c = config('db');
    if (empty($c['dsn'])) throw new ApiError(503, 'The database is not set up yet.');
    $pdo = new PDO($c['dsn'], $c['user'] ?? null, $c['pass'] ?? null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    if (is_sqlite()) $pdo->exec('PRAGMA foreign_keys = ON');
    return $pdo;
}

function is_sqlite(): bool
{
    return str_starts_with((string)(config('db')['dsn'] ?? ''), 'sqlite:');
}

function q(string $sql, array $args = []): PDOStatement
{
    $st = db()->prepare($sql);
    $st->execute($args);
    return $st;
}

function row(string $sql, array $args = []): ?array
{
    $r = q($sql, $args)->fetch();
    return $r ?: null;
}

function rows(string $sql, array $args = []): array
{
    return q($sql, $args)->fetchAll();
}

function insert(string $table, array $data): int
{
    $cols = array_keys($data);
    $sql = sprintf(
        'INSERT INTO %s (%s) VALUES (%s)',
        $table,
        implode(',', $cols),
        implode(',', array_fill(0, count($cols), '?'))
    );
    q($sql, array_values($data));
    return (int)db()->lastInsertId();
}

function update(string $table, int $id, array $data): void
{
    if (!$data) return;
    $set = implode(',', array_map(fn($c) => "$c = ?", array_keys($data)));
    q("UPDATE $table SET $set WHERE id = ?", [...array_values($data), $id]);
}

function now(): string
{
    return date('Y-m-d H:i:s');
}

// After a deploy that changed schema.sql or the added columns, brings the database up to date by itself
// (one tiny query per request otherwise). Before the installer has run there are no tables: it does nothing.
function ensure_schema(): void
{
    $want = md5((string)file_get_contents(dirname(__DIR__) . '/schema.sql') . (string)file_get_contents(__FILE__));
    try {
        $have = row("SELECT value FROM settings WHERE name = 'schema_version'")['value'] ?? null;
    } catch (Throwable $e) {
        return;
    }
    if ($have === $want) return;
    install_schema();
    q("DELETE FROM settings WHERE name = 'schema_version'");
    insert('settings', ['name' => 'schema_version', 'value' => $want]);
}

// Creates the tables. MySQL schema is the source; SQLite (local tests) gets a light translation.
function install_schema(): void
{
    $sql = file_get_contents(dirname(__DIR__) . '/schema.sql');
    if (is_sqlite()) {
        $sql = preg_replace('/\bINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY\b/', 'INTEGER PRIMARY KEY AUTOINCREMENT', $sql);
        $sql = preg_replace('/\) ENGINE=InnoDB[^;]*;/', ');', $sql);
        $sql = preg_replace('/\bUNSIGNED\b/', '', $sql);
        $sql = preg_replace('/,\s*(UNIQUE )?KEY \w+ \([^)]*\)/', '', $sql);
        $sql = str_replace(' ON UPDATE CURRENT_TIMESTAMP', '', $sql);
        $sql = preg_replace('/ENUM\([^)]*\)/', 'TEXT', $sql);
    }
    $sql = preg_replace('/^\s*--.*$/m', '', $sql);
    foreach (array_filter(array_map('trim', explode(';', $sql))) as $stmt) {
        db()->exec($stmt);
    }
    // Columns added after the first release: a database made by an older version gets them here
    foreach ([['sms_contacts', 'call_me', 'TINYINT NOT NULL DEFAULT 0'], ['subscribers', 'lang', "VARCHAR(5) NOT NULL DEFAULT 'en'"], ['sms_contacts', 'lang', "VARCHAR(5) NOT NULL DEFAULT 'en'"],
        ['testimonies', 'place', "VARCHAR(120) NOT NULL DEFAULT ''"], ['testimonies', 'media', "VARCHAR(300) NOT NULL DEFAULT ''"],
        ['testimonies', 'photo', "VARCHAR(300) NOT NULL DEFAULT ''"], ['testimonies', 'contact', "VARCHAR(190) NOT NULL DEFAULT ''"]] as [$t, $c, $def]) {
        $has = is_sqlite()
            ? in_array($c, array_column(rows("PRAGMA table_info($t)"), 'name'), true)
            : (bool)rows("SHOW COLUMNS FROM `$t` LIKE '$c'");
        if (!$has) db()->exec("ALTER TABLE $t ADD COLUMN $c $def");
    }
}
