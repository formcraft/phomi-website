<?php
declare(strict_types=1);

// The whole Bible (KJV and the World English Bible, both public domain), stored in our own database,
// plus the Verse of the Day / Verse of the Week plan. Plain scripts only: nothing here calls an outside service.

const BIBLE_TRANSLATIONS = ['kjv' => 'King James Version', 'web' => 'World English Bible', 'lug' => 'Bayibuli Entukuvu (Luganda)'];

// The Luganda Bible: Biblica® Open Luganda Contemporary Bible, CC BY-SA 4.0 (see api/data/README.md)
const BIBLE_CREDITS = [
    'lug' => 'Bayibuli Entukuvu (Luganda Contemporary Bible) © 1984, 1986, 1993, 2014 Biblica, Inc. Used under CC BY-SA 4.0. Free at open.bible.',
];

// Luganda book names, in the same order as BIBLE_BOOKS (used for Luganda references and for search)
const BIBLE_BOOKS_LG = [1 => 'Olubereberye', 'Okuva', 'Eby’Abaleevi', 'Okubala', 'Ekyamateeka', 'Yoswa', 'Ekyabalamuzi', 'Luusi',
    '1 Samwiri', '2 Samwiri', '1 Bassekabaka', '2 Bassekabaka', '1 Ebyomumirembe', '2 Ebyomumirembe', 'Ezera', 'Nekkemiya', 'Eseza',
    'Yobu', 'Zabbuli', 'Engero', 'Omubuulizi', 'Oluyimba', 'Isaaya', 'Yeremiya', 'Okukungubaga', 'Ezeekyeri', 'Danyeri', 'Koseya',
    'Yoweeri', 'Amosi', 'Obadiya', 'Yona', 'Mikka', 'Nakkumu', 'Kaabakuuku', 'Zeffaniya', 'Kaggayi', 'Zekkaliya', 'Malaki',
    'Matayo', 'Makko', 'Lukka', 'Yokaana', 'Ebikolwa by’Abatume', 'Abaruumi', '1 Abakkolinso', '2 Abakkolinso', 'Abaggalatiya',
    'Abaefeso', 'Abafiripi', 'Abakkolosaayi', '1 Abassessaloniika', '2 Abassessaloniika', '1 Timoseewo', '2 Timoseewo', 'Tito',
    'Firemooni', 'Abaebbulaniya', 'Yakobo', '1 Peetero', '2 Peetero', '1 Yokaana', '2 Yokaana', '3 Yokaana', 'Yuda', 'Okubikkulirwa'];

// Verse of the Day themes in Luganda
const VERSE_THEMES_LG = ['Faith' => 'Okukkiriza', 'Hope' => 'Essuubi', 'Love' => 'Okwagala', 'Prayer' => 'Okusaba', 'Strength' => 'Amaanyi',
    'Peace' => 'Emirembe', 'Trust' => 'Okwesiga Katonda', 'Provision' => 'Katonda agaba', 'Healing' => 'Okuwonyezebwa', 'Family' => 'Amaka',
    'Salvation' => 'Obulokozi', 'Praise' => 'Okutendereza', 'Guidance' => 'Okulungamizibwa', 'Service' => 'Okuweereza',
    'Grace and forgiveness' => 'Ekisa n’okusonyiyibwa', 'Comfort' => 'Okubudaabudibwa', 'Joy' => 'Essanyu'];

// [name, chapters, extra short names people type]
const BIBLE_BOOKS = [
    1 => ['Genesis', 50, 'gen ge gn'], ['Exodus', 40, 'ex exo exod'], ['Leviticus', 27, 'lev le lv'], ['Numbers', 36, 'num nu nm nb'],
    ['Deuteronomy', 34, 'deut de dt'], ['Joshua', 24, 'josh jos jsh'], ['Judges', 21, 'judg jdg jg jdgs'], ['Ruth', 4, 'rth ru'],
    ['1 Samuel', 31, '1sam 1sa 1sm'], ['2 Samuel', 24, '2sam 2sa 2sm'], ['1 Kings', 22, '1kgs 1ki 1kin'], ['2 Kings', 25, '2kgs 2ki 2kin'],
    ['1 Chronicles', 29, '1chr 1ch 1chron'], ['2 Chronicles', 36, '2chr 2ch 2chron'], ['Ezra', 10, 'ezr'], ['Nehemiah', 13, 'neh ne'],
    ['Esther', 10, 'esth est es'], ['Job', 42, 'jb'], ['Psalms', 150, 'ps psa psalm pslm psm pss'], ['Proverbs', 31, 'prov pro prv pr'],
    ['Ecclesiastes', 12, 'eccl eccles ecc ec qoh'], ['Song of Solomon', 8, 'song sos songofsongs canticles so sg'], ['Isaiah', 66, 'isa is'],
    ['Jeremiah', 52, 'jer je jr'], ['Lamentations', 5, 'lam la'], ['Ezekiel', 48, 'ezek eze ezk'], ['Daniel', 12, 'dan da dn'],
    ['Hosea', 14, 'hos ho'], ['Joel', 3, 'jl'], ['Amos', 9, 'am'], ['Obadiah', 1, 'obad ob'], ['Jonah', 4, 'jnh jon'], ['Micah', 7, 'mic mc'],
    ['Nahum', 3, 'nah na'], ['Habakkuk', 3, 'hab hb'], ['Zephaniah', 3, 'zeph zep zp'], ['Haggai', 2, 'hag hg'], ['Zechariah', 14, 'zech zec zc'],
    ['Malachi', 4, 'mal ml'], ['Matthew', 28, 'matt mat mt'], ['Mark', 16, 'mrk mk mr'], ['Luke', 24, 'luk lk'], ['John', 21, 'jhn jn joh'],
    ['Acts', 28, 'act ac'], ['Romans', 16, 'rom ro rm'], ['1 Corinthians', 16, '1cor 1co'], ['2 Corinthians', 13, '2cor 2co'],
    ['Galatians', 6, 'gal ga'], ['Ephesians', 6, 'eph ephes'], ['Philippians', 4, 'phil php pp'], ['Colossians', 4, 'col co'],
    ['1 Thessalonians', 5, '1thess 1th 1thes'], ['2 Thessalonians', 3, '2thess 2th 2thes'], ['1 Timothy', 6, '1tim 1ti 1tm'],
    ['2 Timothy', 4, '2tim 2ti 2tm'], ['Titus', 3, 'tit ti'], ['Philemon', 1, 'philem phm phlm'], ['Hebrews', 13, 'heb'],
    ['James', 5, 'jas jm'], ['1 Peter', 5, '1pet 1pe 1pt'], ['2 Peter', 3, '2pet 2pe 2pt'], ['1 John', 5, '1jn 1jhn 1jo'],
    ['2 John', 1, '2jn 2jhn 2jo'], ['3 John', 1, '3jn 3jhn 3jo'], ['Jude', 1, 'jud jd'], ['Revelation', 22, 'rev re rv revelations apocalypse'],
];

function bible_book_index(): array
{
    static $idx = null;
    if ($idx !== null) return $idx;
    $idx = [];
    foreach (BIBLE_BOOKS as $n => [$name, , $alt]) {
        $idx[str_replace(' ', '', strtolower($name))] = $n;
        foreach (explode(' ', $alt) as $a) $idx[$a] = $n;
        $idx[bible_squash(BIBLE_BOOKS_LG[$n])] ??= $n; // Luganda: "Yokaana", "Zabbuli", "Ebikolwa by'Abatume"
    }
    return $idx;
}

function bible_squash(string $s): string
{
    return str_replace([' ', "'", '’'], '', mb_strtolower($s));
}

// Finds a book from what someone typed: "John", "jn", "1 Cor", "I Corinthians", "Psalm", "Song of Songs".
function bible_find_book(string $s): ?int
{
    $s = strtolower(trim(preg_replace('/[.\s]+/', ' ', $s)));
    $s = preg_replace('/^(iii|3rd|third)\s*/', '3', $s);
    $s = preg_replace('/^(ii|2nd|second)\s*/', '2', $s);
    $s = preg_replace('/^(i|1st|first)\s+(?=[a-z])/', '1', $s);
    $s = str_replace([' ', "'", '’'], '', $s);
    if ($s === '') return null;
    $idx = bible_book_index();
    if (isset($idx[$s])) return $idx[$s];
    if (strlen($s) < 2) return null;
    foreach (BIBLE_BOOKS as $n => [$name]) {
        if (str_starts_with(str_replace(' ', '', strtolower($name)), $s)) return $n;
    }
    foreach (BIBLE_BOOKS_LG as $n => $name) {
        if (strlen($s) >= 3 && str_starts_with(bible_squash($name), $s)) return $n;
    }
    return null;
}

// "John 3:16", "Psalm 23", "Ps 23:1-4", "1 Cor 13:4-7", "Jude 3", "Romans 8:28 - 8:39" → [book, chapter, from, to] (from/to null = whole chapter)
function bible_parse_ref(string $ref): ?array
{
    $ref = trim(str_replace(['–', '—', '.', '’'], ['-', '-', ' ', "'"], $ref));
    if (!preg_match('/^((?:[1-3]|i{1,3}|first|second|third|1st|2nd|3rd)?\s*[a-z][a-z\s\']*?)\s*(\d+)(?:\s*:\s*(\d+)(?:\s*-\s*(?:\d+\s*:\s*)?(\d+))?)?\s*$/i', $ref, $m)) return null;
    $book = bible_find_book($m[1]);
    if (!$book) return null;
    $ch = (int)$m[2];
    $one = BIBLE_BOOKS[$book][1] === 1;
    if ($one && empty($m[3])) return [$book, 1, $ch, $ch]; // "Jude 3" means verse 3
    if ($ch < 1 || $ch > BIBLE_BOOKS[$book][1]) return null;
    $from = isset($m[3]) && $m[3] !== '' ? (int)$m[3] : null;
    $to = isset($m[4]) && $m[4] !== '' ? (int)$m[4] : $from;
    if ($from !== null && $to < $from) [$from, $to] = [$to, $from];
    return [$book, $ch, $from, $to];
}

// Luganda references for the Luganda Bible ("Yokaana 3:16"), English for the others
function bible_ref_label(array $p, string $tr = ''): string
{
    [$b, $c, $f, $t] = $p;
    $name = $tr === 'lug' ? BIBLE_BOOKS_LG[$b] : BIBLE_BOOKS[$b][0];
    if ($name === 'Psalms') $name = 'Psalm';
    if ($f === null) return "$name $c";
    if (BIBLE_BOOKS[$b][1] === 1) return $f === $t ? "$name $f" : "$name $f-$t";
    return $f === $t ? "$name $c:$f" : "$name $c:$f-$t";
}

function bible_tr(string $tr): string
{
    $tr = strtolower($tr);
    if (isset(BIBLE_TRANSLATIONS[$tr])) return $tr;
    $d = function_exists('setting') ? setting('bible_default') : 'kjv';
    return isset(BIBLE_TRANSLATIONS[$d]) ? $d : 'kjv';
}

function bible_ready(): bool
{
    try {
        // Every translation in api/data must be loaded (a site set up before Luganda was added picks it up here)
        $n = rows("SELECT translation, COUNT(*) AS n FROM bible_verses WHERE book = 66 GROUP BY translation");
        $have = array_column($n, 'n', 'translation');
        foreach (array_keys(BIBLE_TRANSLATIONS) as $tr) if ((int)($have[$tr] ?? 0) < 300) return false;
        return true;
    } catch (Throwable $e) {
        return false;
    }
}

// Loads the Bible text from api/data/bible-<tr>.tsv.gz into the database. Safe to run again.
function bible_import(): array
{
    $done = [];
    foreach (array_keys(BIBLE_TRANSLATIONS) as $tr) {
        $file = dirname(__DIR__) . "/data/bible-$tr.tsv.gz";
        $have = (int)(row('SELECT COUNT(*) AS n FROM bible_verses WHERE translation = ?', [$tr])['n'] ?? 0);
        if ($have > 30000) { $done[$tr] = $have; continue; }
        if (!is_file($file)) throw new ApiError(500, "The Bible file $file is missing.");
        db()->beginTransaction();
        q('DELETE FROM bible_verses WHERE translation = ?', [$tr]);
        $stmt = db()->prepare('INSERT INTO bible_verses (translation, book, chapter, verse, text) VALUES (?, ?, ?, ?, ?)');
        $n = 0;
        foreach (gzfile($file) as $line) {
            $p = explode("\t", rtrim($line, "\r\n"), 4);
            if (count($p) < 4 || $p[3] === '') continue;
            $stmt->execute([$tr, (int)$p[0], (int)$p[1], (int)$p[2], $p[3]]);
            $n++;
        }
        db()->commit();
        $done[$tr] = $n;
    }
    return $done;
}

function bible_chapter(string $tr, int $book, int $ch): array
{
    if (!isset(BIBLE_BOOKS[$book]) || $ch < 1 || $ch > BIBLE_BOOKS[$book][1]) throw new ApiError(404, 'That chapter does not exist.');
    $tr = bible_tr($tr);
    return [
        'translation' => $tr,
        'book' => $book,
        'name' => BIBLE_BOOKS[$book][0],
        'name_lg' => BIBLE_BOOKS_LG[$book],
        'credit' => BIBLE_CREDITS[$tr] ?? '',
        'chapter' => $ch,
        'chapters' => BIBLE_BOOKS[$book][1],
        'verses' => array_map(fn($r) => ['v' => (int)$r['verse'], 't' => $r['text']],
            rows('SELECT verse, text FROM bible_verses WHERE translation = ? AND book = ? AND chapter = ? ORDER BY verse', [$tr, $book, $ch])),
    ];
}

// The words of a reference, e.g. "John 3:16" → ['ref' => 'John 3:16', 'text' => 'For God so loved…', 'verses' => […]]
function bible_passage(string $ref, string $tr = ''): ?array
{
    $p = bible_parse_ref($ref);
    if (!$p) return null;
    [$b, $c, $f, $t] = $p;
    $tr = bible_tr($tr);
    $args = [$tr, $b, $c];
    $sql = 'SELECT verse, text FROM bible_verses WHERE translation = ? AND book = ? AND chapter = ?';
    if ($f !== null) {
        $sql .= ' AND verse BETWEEN ? AND ?';
        array_push($args, $f, min($t, $f + 40));
    }
    $vs = rows($sql . ' ORDER BY verse', $args);
    if (!$vs) return null;
    return [
        'ref' => bible_ref_label($p, $tr),
        'translation' => $tr,
        'book' => $b,
        'chapter' => $c,
        'text' => implode(' ', array_column($vs, 'text')),
        'verses' => array_map(fn($r) => ['v' => (int)$r['verse'], 't' => $r['text']], $vs),
    ];
}

function bible_search(string $q, string $tr = '', int $limit = 60): array
{
    $tr = bible_tr($tr);
    $q = trim(preg_replace('/\s+/', ' ', $q));
    if (mb_strlen($q) < 3) throw new ApiError(422, 'Type at least three letters to search.');
    $words = array_slice(array_filter(explode(' ', $q), fn($w) => mb_strlen($w) >= 2), 0, 6);
    $where = implode(' AND ', array_fill(0, count($words), 'text LIKE ?'));
    $args = [$tr];
    foreach ($words as $w) $args[] = '%' . str_replace(['%', '_'], '', $w) . '%';
    $total = (int)(row("SELECT COUNT(*) AS n FROM bible_verses WHERE translation = ? AND $where", $args)['n'] ?? 0);
    $rs = rows("SELECT book, chapter, verse, text FROM bible_verses WHERE translation = ? AND $where ORDER BY book, chapter, verse LIMIT " . max(1, min(200, $limit)), $args);
    return [
        'translation' => $tr,
        'total' => $total,
        'results' => array_map(fn($r) => ['ref' => bible_ref_label([(int)$r['book'], (int)$r['chapter'], (int)$r['verse'], (int)$r['verse']], $tr),
            'book' => (int)$r['book'], 'chapter' => (int)$r['chapter'], 'v' => (int)$r['verse'], 't' => $r['text']], $rs),
    ];
}

// ---------- Verse of the Day / Verse of the Week ----------
// Not random: the admin plans verses for chosen dates (Admin → Daily verses). Any day without a planned verse
// takes the next one from the church's built-in list below, in order, so the whole list comes round once a year.

const VERSE_THEMES = [
    'Faith' => ['Hebrews 11:1', 'Mark 11:22-24', 'Romans 10:17', '2 Corinthians 5:7', 'Hebrews 11:6', 'Matthew 17:20', 'James 2:17', 'Galatians 2:20', 'Romans 5:1', 'Habakkuk 2:4', 'Ephesians 2:8-9', '1 John 5:4', 'Luke 1:37', 'Mark 9:23'],
    'Hope' => ['Jeremiah 29:11', 'Romans 15:13', 'Lamentations 3:22-23', 'Psalm 42:11', 'Isaiah 40:31', 'Romans 8:28', 'Hebrews 6:19', 'Psalm 71:14', 'Romans 5:3-5', '1 Peter 1:3', 'Psalm 31:24', 'Proverbs 23:18', 'Micah 7:7', 'Titus 2:13'],
    'Love' => ['John 3:16', '1 Corinthians 13:4-7', '1 John 4:19', 'Romans 5:8', 'John 15:12-13', '1 John 4:7-8', 'Romans 8:38-39', '1 Peter 4:8', 'Colossians 3:14', 'Ephesians 3:17-19', 'Zephaniah 3:17', 'Jeremiah 31:3', 'John 13:34-35', 'Romans 13:10'],
    'Prayer' => ['Philippians 4:6-7', '1 Thessalonians 5:16-18', 'Matthew 7:7-8', 'Jeremiah 33:3', 'James 5:16', 'Mark 11:24', 'Matthew 6:6', '1 John 5:14-15', 'Psalm 145:18', 'Romans 12:12', 'Matthew 18:19-20', 'Luke 18:1', 'Colossians 4:2', 'Psalm 5:3'],
    'Strength' => ['Philippians 4:13', 'Isaiah 41:10', 'Joshua 1:9', 'Psalm 46:1', 'Nehemiah 8:10', '2 Corinthians 12:9', 'Psalm 28:7', 'Isaiah 40:29', 'Ephesians 6:10', 'Psalm 73:26', 'Deuteronomy 31:6', 'Psalm 18:2', 'Habakkuk 3:19', '2 Timothy 1:7'],
    'Peace' => ['John 14:27', 'Isaiah 26:3', 'Psalm 4:8', 'Colossians 3:15', 'Romans 12:18', 'Matthew 5:9', 'John 16:33', 'Psalm 29:11', 'Numbers 6:24-26', 'Psalm 34:14', 'Romans 14:19', 'Isaiah 9:6', '2 Thessalonians 3:16', 'Proverbs 16:7'],
    'Trust' => ['Proverbs 3:5-6', 'Psalm 56:3', 'Psalm 37:5', 'Isaiah 12:2', 'Psalm 9:10', 'Jeremiah 17:7-8', 'Psalm 62:8', 'Nahum 1:7', 'Psalm 20:7', 'Psalm 125:1', 'Isaiah 26:4', 'Psalm 112:7', 'Psalm 118:8', 'Psalm 37:3'],
    'Provision' => ['Philippians 4:19', 'Matthew 6:33', 'Psalm 23:1', 'Psalm 37:25', 'Matthew 6:31-32', '2 Corinthians 9:8', 'Psalm 34:10', 'Deuteronomy 8:18', 'Malachi 3:10', 'Luke 6:38', 'Psalm 84:11', 'Proverbs 10:22', 'Genesis 22:14', 'Matthew 7:11'],
    'Healing' => ['Jeremiah 17:14', 'Isaiah 53:5', 'Psalm 103:2-3', 'Exodus 15:26', 'James 5:14-15', 'Psalm 147:3', '3 John 2', 'Jeremiah 30:17', 'Proverbs 4:20-22', 'Matthew 8:17', 'Psalm 30:2', 'Malachi 4:2', 'Mark 5:34', 'Acts 10:38'],
    'Family' => ['Joshua 24:15', 'Proverbs 22:6', 'Psalm 127:3', 'Ephesians 6:1-3', 'Colossians 3:13', 'Ephesians 5:25', 'Proverbs 31:10', 'Psalm 128:1-3', 'Deuteronomy 6:6-7', 'Ephesians 4:32', 'Psalm 133:1', 'Proverbs 17:17', '1 Timothy 5:8', 'Acts 16:31'],
    'Salvation' => ['Romans 10:9', 'Acts 4:12', 'John 14:6', 'Romans 6:23', '2 Corinthians 5:17', 'Ephesians 2:4-5', 'Titus 3:5', 'John 1:12', '1 John 1:9', 'Romans 3:23-24', 'John 10:10', 'Isaiah 1:18', 'Acts 2:21', 'Revelation 3:20'],
    'Praise' => ['Psalm 150:6', 'Psalm 100:4', 'Psalm 34:1', 'Psalm 118:24', 'Hebrews 13:15', 'Psalm 95:1-2', 'Psalm 103:1', 'Psalm 136:1', 'Psalm 47:1', 'Isaiah 25:1', 'Psalm 63:3-4', 'Psalm 9:1-2', '1 Chronicles 16:34', 'Psalm 146:1-2'],
    'The Word' => ['Psalm 119:105', 'Joshua 1:8', '2 Timothy 3:16-17', 'Hebrews 4:12', 'Matthew 4:4', 'Psalm 119:11', 'Isaiah 40:8', 'James 1:22', 'John 1:1', 'Romans 15:4', 'Colossians 3:16', 'Psalm 1:1-3', 'John 8:31-32', 'Proverbs 30:5'],
    'Guidance' => ['Psalm 32:8', 'Isaiah 30:21', 'Proverbs 16:9', 'James 1:5', 'Psalm 25:4-5', 'Psalm 37:23', 'Isaiah 58:11', 'John 16:13', 'Psalm 143:8', 'Proverbs 2:6', 'Psalm 48:14', 'Isaiah 48:17', 'Psalm 25:9', 'Proverbs 4:18'],
    'Service' => ['Mark 16:15', 'Matthew 28:19-20', 'Galatians 6:9', 'Matthew 5:16', '1 Peter 4:10', 'Colossians 3:23', 'Mark 10:45', 'Hebrews 13:16', 'Isaiah 6:8', 'Galatians 5:13', 'Acts 1:8', '1 Corinthians 15:58', 'Romans 12:1', 'Micah 6:8'],
    'Grace and forgiveness' => ['Ephesians 1:7', 'Psalm 103:12', 'Titus 2:11', 'Hebrews 4:16', 'Micah 7:18', 'Matthew 6:14', 'Isaiah 43:25', 'Romans 8:1', 'Lamentations 3:22', 'John 1:16', 'Psalm 86:5', 'Colossians 1:13-14', 'Luke 6:37', 'Acts 3:19'],
    'Comfort' => ['Psalm 34:18', 'Matthew 11:28-30', '2 Corinthians 1:3-4', 'Revelation 21:4', 'Psalm 23:4', 'Isaiah 43:2', 'Psalm 30:5', 'John 14:1-3', 'Psalm 55:22', '1 Peter 5:7', 'Isaiah 66:13', 'Psalm 121:1-2', 'Deuteronomy 33:27', 'Matthew 5:4'],
    'Joy' => ['Psalm 16:11', 'Psalm 97:11', 'Philippians 4:4', 'Isaiah 55:12', 'John 15:11', 'Psalm 126:3', 'Galatians 5:22-23', 'James 1:2-3', 'Psalm 5:11', 'Isaiah 61:10', 'Habakkuk 3:17-18', 'Psalm 30:11', '1 Peter 1:8', 'Proverbs 17:22'],
];

const WEEK_VERSES = [
    ['Mark 16:15', 'Go into all the world'], ['Proverbs 3:5-6', 'Trust in the Lord'], ['Joshua 1:9', 'Be strong and courageous'],
    ['Psalm 23:1-3', 'The Lord is my shepherd'], ['Isaiah 40:31', 'Wait upon the Lord'], ['Romans 8:28', 'All things work together'],
    ['Philippians 4:6-7', 'Do not be anxious'], ['Matthew 6:33', 'Seek first the kingdom'], ['Jeremiah 29:11', 'A future and a hope'],
    ['John 15:5', 'Abide in the vine'], ['Galatians 6:9', 'Do not grow weary'], ['Psalm 46:10', 'Be still'],
    ['2 Corinthians 5:17', 'A new creation'], ['Isaiah 41:10', 'Fear not'], ['Micah 6:8', 'What the Lord requires'],
    ['Matthew 5:14-16', 'Light of the world'], ['Romans 12:2', 'A renewed mind'], ['Psalm 121:1-2', 'My help comes from the Lord'],
    ['1 Corinthians 13:4-7', 'Love is patient'], ['Ephesians 6:10-11', 'The armour of God'], ['James 1:5', 'Ask for wisdom'],
    ['Hebrews 12:1-2', 'Run the race'], ['Psalm 91:1-2', 'Under His shadow'], ['John 14:27', 'My peace I give you'],
    ['Colossians 3:23-24', 'Work as for the Lord'], ['Psalm 119:105', 'A lamp to my feet'], ['Matthew 11:28-30', 'Come to me and rest'],
    ['Lamentations 3:22-23', 'New every morning'], ['Acts 1:8', 'You shall be witnesses'], ['Romans 15:13', 'The God of hope'],
    ['Isaiah 43:2', 'Through the waters'], ['Joshua 24:15', 'As for me and my house'], ['Psalm 37:4-5', 'Delight in the Lord'],
    ['1 Peter 5:6-7', 'Cast your cares on Him'], ['Hebrews 11:1', 'Faith is the substance'], ['Philippians 4:13', 'Strength in Christ'],
    ['Malachi 3:10', 'Bring the whole tithe'], ['2 Chronicles 7:14', 'If my people will pray'], ['John 10:10', 'Life to the full'],
    ['Psalm 100:4-5', 'Enter with thanksgiving'], ['Nehemiah 8:10', 'The joy of the Lord'], ['Matthew 28:19-20', 'Make disciples'],
    ['Romans 12:10-13', 'Love one another'], ['Ephesians 2:8-10', 'Saved by grace'], ['Psalm 27:1', 'The Lord is my light'],
    ['Isaiah 26:3', 'Perfect peace'], ['James 5:16', 'The prayer of the righteous'], ['Deuteronomy 31:8', 'He goes before you'],
    ['Psalm 103:1-5', 'Bless the Lord, O my soul'], ['Galatians 5:22-23', 'The fruit of the Spirit'], ['Luke 2:10-11', 'Good news of great joy'],
    ['Revelation 21:5', 'All things new'],
];

// The built-in daily list: themes take turns so that two days in a row never share a theme.
function verse_default_list(): array
{
    static $list = null;
    if ($list !== null) return $list;
    $list = [];
    $themes = VERSE_THEMES;
    $max = max(array_map('count', $themes));
    for ($i = 0; $i < $max; $i++) {
        foreach ($themes as $theme => $refs) if (isset($refs[$i])) $list[] = [$refs[$i], $theme];
    }
    return $list;
}

function week_start(string $date): string
{
    $t = strtotime($date . ' 12:00:00');
    return date('Y-m-d', $t - ((int)date('N', $t) - 1) * 86400);
}

// The verse for a date ('day') or for the week containing it ('week'), with its words.
function verse_for(string $date, string $kind = 'day', string $tr = ''): ?array
{
    $date = date('Y-m-d', strtotime($date . ' 12:00:00'));
    $key = $kind === 'week' ? week_start($date) : $date;
    $planned = null;
    try {
        $planned = row("SELECT * FROM verses WHERE kind = ? AND show_on = ? AND status = 'live' ORDER BY id DESC LIMIT 1", [$kind, $key]);
    } catch (Throwable $e) {
        // table missing before the installer runs
    }
    if ($planned) {
        $ref = $planned['reference'];
        $theme = $planned['theme'];
        $note = (string)$planned['note'];
    } else {
        $note = '';
        if ($kind === 'week') {
            $i = (int)floor((strtotime($key . ' 12:00:00') - strtotime('2024-01-01 12:00:00')) / 604800);
            [$ref, $theme] = WEEK_VERSES[(($i % count(WEEK_VERSES)) + count(WEEK_VERSES)) % count(WEEK_VERSES)];
        } else {
            $list = verse_default_list();
            $i = (int)floor((strtotime($key . ' 12:00:00') - strtotime('2024-01-01 12:00:00')) / 86400);
            [$ref, $theme] = $list[(($i % count($list)) + count($list)) % count($list)];
        }
    }
    $p = bible_ready() ? bible_passage($ref, $tr) : null;
    return [
        'kind' => $kind,
        'date' => $key,
        'ref' => $p['ref'] ?? $ref,
        'theme' => ($p['translation'] ?? '') === 'lug' ? (VERSE_THEMES_LG[$theme] ?? '') : $theme,
        'note' => $note,
        'text' => $p['text'] ?? '',
        'translation' => $p['translation'] ?? bible_tr($tr),
        'planned' => (bool)$planned,
        'image' => site_path_image($key, $kind, $p['translation'] ?? ''),
    ];
}

function site_path_image(string $date, string $kind, string $tr = ''): string
{
    return "/api/verse/image?d=$date&k=$kind" . ($tr === 'lug' ? '&tr=lug' : '');
}

// ---------- Verse pictures for WhatsApp status, Facebook and email ----------

const VERSE_PHOTOS = ['worship-outdoor', 'church-dusk', 'kneeling-prayer', 'women-praise', 'church-tree', 'service-hall', 'crusade-field', 'worship-leader', 'church-front', 'fellowship'];

// Draws the verse picture and keeps it in uploads/verses/. $size: 'post' (1080×1350) or 'story' (1080×1920).
function verse_image(string $date, string $kind, string $size, string $tr = ''): string
{
    $date = date('Y-m-d', strtotime($date . ' 12:00:00'));
    $kind = $kind === 'week' ? 'week' : 'day';
    $size = $size === 'story' ? 'story' : 'post';
    $v = verse_for($date, $kind, isset(BIBLE_TRANSLATIONS[$tr]) ? $tr : '');
    $lg = $v['translation'] === 'lug';
    if (!$v || $v['text'] === '') throw new ApiError(503, 'The Bible text is not loaded yet.');
    $dir = rtrim((string)config('uploads_dir'), '/') . '/verses';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $file = "$dir/{$v['date']}-$kind-$size-" . substr(md5($v['ref'] . $v['text'] . $v['translation'] . '6'), 0, 8) . '.jpg';
    if (is_file($file)) return $file;

    [$W, $H] = $size === 'story' ? [1080, 1920] : [1080, 1350];
    $im = imagecreatetruecolor($W, $H);
    $navy = imagecolorallocate($im, 27, 42, 71);
    imagefill($im, 0, 0, $navy);
    $web = dirname(__DIR__, 2);
    if (!is_dir("$web/img") && is_dir("$web/public/img")) $web .= '/public'; // running from the repository
    $photo = $web . '/img/' . VERSE_PHOTOS[abs(crc32($v['date'] . $kind)) % count(VERSE_PHOTOS)] . '.jpg';
    if (is_file($photo) && ($src = @imagecreatefromjpeg($photo))) {
        $sw = imagesx($src);
        $sh = imagesy($src);
        $scale = max($W / $sw, $H / $sh);
        $cw = (int)($W / $scale);
        $chh = (int)($H / $scale);
        imagecopyresampled($im, $src, 0, 0, (int)(($sw - $cw) / 2), (int)(($sh - $chh) / 2), $W, $H, $cw, $chh);
        imagedestroy($src);
        imagefilter($im, IMG_FILTER_GAUSSIAN_BLUR);
        imagefilter($im, IMG_FILTER_GAUSSIAN_BLUR);
    }
    // Navy veil, darker in the middle where the words sit
    for ($y = 0; $y < $H; $y++) {
        $mid = 1 - abs($y - $H / 2) / ($H / 2);
        $a = (int)max(0, 127 - (72 + 34 * $mid)); // GD alpha: 0 opaque … 127 clear
        imageline($im, 0, $y, $W, $y, imagecolorallocatealpha($im, 20, 31, 54, $a));
    }
    $gold = imagecolorallocate($im, 214, 176, 102);
    $cream = imagecolorallocate($im, 248, 242, 230);
    $soft = imagecolorallocate($im, 205, 211, 224);
    $fonts = dirname(__DIR__) . '/data/fonts';
    $serif = "$fonts/Playfair-Italic.ttf";
    $label = "$fonts/Poppins-SemiBold.ttf";
    $sans = "$fonts/Poppins-Medium.ttf";
    $pad = 110;

    $eyebrow = $lg ? ($kind === 'week' ? 'EKYAWANDIIKIBWA KYA WIIKI' : 'EKYAWANDIIKIBWA KYA LEERO') : ($kind === 'week' ? 'VERSE OF THE WEEK' : 'VERSE OF THE DAY');
    $top = $size === 'story' ? 330 : 190;
    verse_text_spaced($im, 26, $label, $gold, $eyebrow, $W, $top, 6);
    $theme = mb_strtoupper($v['theme']);
    verse_text_spaced($im, 22, $sans, $soft, $theme, $W, $top + 52, 4);
    imagefilledrectangle($im, (int)($W / 2 - 40), $top + 90, (int)($W / 2 + 40), $top + 93, $gold);

    // Fit the verse: largest size that fits the space
    $text = '“' . $v['text'] . '”';
    $boxTop = $top + 150;
    $boxH = ($size === 'story' ? 1920 - 560 : 1350 - 330) - $boxTop;
    $lines = [];
    $fs = 64;
    for (; $fs >= 30; $fs -= 2) {
        $lines = verse_wrap($text, $serif, $fs, $W - 2 * $pad);
        if (count($lines) * $fs * 1.45 <= $boxH) break;
    }
    $lh = (int)($fs * 1.45);
    $maxLines = (int)floor($boxH / $lh);
    if (count($lines) > $maxLines) {
        $lines = array_slice($lines, 0, $maxLines);
        $lines[$maxLines - 1] = rtrim($lines[$maxLines - 1], ' ,.;:”') . '…”';
    }
    $y = $boxTop + (int)(($boxH - count($lines) * $lh) / 2) + $fs;
    foreach ($lines as $ln) {
        $bb = imagettfbbox($fs, 0, $serif, $ln);
        imagettftext($im, $fs, 0, (int)(($W - ($bb[2] - $bb[0])) / 2), $y, $cream, $serif, $ln);
        $y += $lh;
    }
    $y += 36;
    $ref = $v['ref'] . '  ·  ' . strtoupper($v['translation']);
    $bb = imagettfbbox(30, 0, $label, $ref);
    imagettftext($im, 30, 0, (int)(($W - ($bb[2] - $bb[0])) / 2), $y, $gold, $label, $ref);

    // Church name at the bottom
    $by = $H - ($size === 'story' ? 300 : 150);
    imagefilledrectangle($im, (int)($W / 2 - 40), $by - 58, (int)($W / 2 + 40), $by - 55, $gold);
    verse_text_spaced($im, 22, $label, $cream, "POTTER'S HOUSE OUTREACH MINISTRIES INTERNATIONAL", $W, $by, 3);
    $host = preg_replace('#^https?://(www\.)?#', '', rtrim((string)config('site_url'), '/'));
    $bb = imagettfbbox(19, 0, $sans, $host);
    imagettftext($im, 19, 0, (int)(($W - ($bb[2] - $bb[0])) / 2), $by + 44, $soft, $sans, $host);

    imageinterlace($im, true);
    imagejpeg($im, $file, 88);
    imagedestroy($im);
    foreach (glob("$dir/{$v['date']}-$kind-$size-*.jpg") ?: [] as $old) if ($old !== $file) @unlink($old);
    return $file;
}

function verse_wrap(string $text, string $font, int $size, int $width): array
{
    $lines = [];
    $cur = '';
    foreach (preg_split('/\s+/', $text) as $w) {
        $try = $cur === '' ? $w : "$cur $w";
        $bb = imagettfbbox($size, 0, $font, $try);
        if ($bb[2] - $bb[0] > $width && $cur !== '') {
            $lines[] = $cur;
            $cur = $w;
        } else {
            $cur = $try;
        }
    }
    if ($cur !== '') $lines[] = $cur;
    return $lines;
}

function verse_text_spaced($im, int $size, string $font, int $color, string $text, int $W, int $y, int $spacing): void
{
    $chars = preg_split('//u', $text, -1, PREG_SPLIT_NO_EMPTY);
    $widths = [];
    $total = 0;
    foreach ($chars as $c) {
        $bb = imagettfbbox($size, 0, $font, $c);
        $w = $c === ' ' ? (int)($size * 0.35) : $bb[2] - $bb[0];
        $widths[] = $w;
        $total += $w + $spacing;
    }
    $x = (int)(($W - $total + $spacing) / 2);
    foreach ($chars as $i => $c) {
        if ($c !== ' ') imagettftext($im, $size, 0, $x, $y, $color, $font, $c);
        $x += $widths[$i] + $spacing;
    }
}
