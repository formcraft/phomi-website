<?php
// Sets up the local preview database: tables, the Bible text and a test admin.
// Run by scripts/local-server.mjs:  PHOMI_CONFIG=.local/config.php php scripts/local-seed.php <email> <password>
declare(strict_types=1);
require dirname(__DIR__) . '/api/lib/bootstrap.php';

install_schema();
if (!bible_ready()) bible_import();
[$email, $pass] = [$argv[1] ?? 'formcraftinc@gmail.com', $argv[2] ?? 'Potters-preview'];
if (!row('SELECT id FROM admins WHERE email = ?', [$email])) {
    insert('admins', ['email' => $email, 'name' => 'Local admin', 'password_hash' => password_hash($pass, PASSWORD_DEFAULT), 'created_at' => now()]);
    if (!row('SELECT id FROM senders WHERE email = ?', [$email])) insert('senders', ['email' => $email, 'name' => 'Local admin', 'created_at' => now()]);
    setting_set('notify_email', $email);
    setting_set('lists_email', 'private.list@phomi.local');
    // Sample testimonies, so the gallery on the Prayer page can be seen in the preview (never on the live site)
    if (!row('SELECT id FROM testimonies LIMIT 1')) {
        $voice = '';
        $src = __DIR__ . '/preview-media/sample-voice.m4a';
        if (is_file($src)) {
            $dir = uploads_ready('samples');
            copy($src, "$dir/sample-voice.m4a");
            $voice = rtrim((string)config('uploads_url'), '/') . '/samples/sample-voice.m4a';
        }
        $samples = [
            ['Grace A.', 'Burweta', 'Healed after the crusade', "For three years I could not bend because of pain in my back. At the crusade the pastor prayed for the sick and I felt heat go through my body. The next morning I dug in my garden for the first time. Glory to God!", '', ''],
            ['Moses K.', 'Kibuku', 'A song of thanks', 'We sang this the Sunday after my son came home from hospital.', $voice, ''],
            ['Sarah N.', 'Mbale', 'Worship on Sunday', '', '/video/hall-worship.mp4', ''],
            ['Peter O.', 'Butebo', '', 'God gave me a job after months of looking. Thank you church for praying with me.', '', ''],
            ['Esther', 'Burweta', 'My family is together again', "My husband and I had separated and the children were suffering. The women's fellowship prayed with me every Wednesday. Slowly God softened our hearts. Last month we came to church together as a family and the pastor prayed over our home. I want every woman who is hurting to know that God hears. Do not stop praying, and do not stop coming to the house of God. He is the potter and we are the clay; He can mend what is broken.", '', '/img/service-family.jpg'],
            ['John W.', 'Pallisa', 'Saved at the outreach', 'I came to the open-air meeting only to watch. That day I gave my life to Jesus.', '', ''],
        ];
        foreach ($samples as $i => [$n, $pl, $ti, $bo, $me, $ph]) {
            insert('testimonies', ['name' => $n, 'place' => $pl, 'title' => $ti, 'body' => $bo, 'media' => $me, 'photo' => $ph, 'contact' => '',
                'status' => 'live', 'source' => 'admin', 'created_at' => date('Y-m-d H:i:s', time() - ($i + 1) * 86400 * 3)]);
        }
    }
}
echo "ready\n";
