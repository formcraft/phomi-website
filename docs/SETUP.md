# Launching on Hostinger

The whole website, the PHP backend included, is built into `dist/` and uploaded to `public_html`. The real settings live in one file **outside** `public_html`, so they are never uploaded and never in GitHub.

```
/home/<user>/domains/pottershouseoutreachministriesinternational.com/
├── phomi-config.php        ← your settings (copy of api/config.sample.php, filled in)
└── public_html/
    ├── index.html, assets/, img/, video/   ← the website
    ├── api/                                ← the PHP backend (index.php, lib/, cron/)
    └── uploads/                            ← photos, audio and video added later (created automatically)
```

## 1. Before you start

1. **Back up the current WordPress site** (hPanel → Files → Backups: download the files and the database).
2. Set PHP to **8.2 or 8.3** with the extensions **curl, gd, mbstring, fileinfo, openssl, pdo_mysql**. Raise `upload_max_filesize` and `post_max_size` to 128M (hPanel → Advanced → PHP Configuration).
3. Create a **MySQL database** (hPanel → Databases).

## 2. Settings file

Create `phomi-config.php` one folder above `public_html` (File Manager), using [`api/config.sample.php`](../api/config.sample.php). Fill in at least `app_key`, `install_token` and the database details. Leave `payments.provider` empty until the payment account is live: the Give page then uses the dial-code method, which works without an account.

## 3. Upload

**Automatic (recommended, free).** In GitHub, add the secrets `FTP_SERVER`, `FTP_USERNAME` and `FTP_PASSWORD` (Settings → Secrets and variables → Actions). Every push to `main` then tests, builds and uploads the site. This uses GitHub Actions, which is free for a public repository; no paid GitHub plan or GitHub command-line tool is needed.

**By hand.** Run `npm ci && npm run build`. Upload the contents of `dist/` into `public_html` (File Manager → Upload, or FTP). Remove the old WordPress files once you have the backup.

## 4. First run

1. Open `https://pottershouseoutreachministriesinternational.com/api/install.php?token=<install_token>`. Every check should show ✅. Create the first admin account with the email **formcraftinc@gmail.com** and a password you choose (10 or more characters, starting with "Potters"). Type it only into the installer; you can change it later in **Admin → Account**.
2. Sign in at `/admin`.
3. **Settings → Update mailbox**: enter the update address and its password, then press *Save and test the mailbox*.
4. **Approved senders**: add everyone allowed to email updates.
5. hPanel → Advanced → **Cron Jobs** → every 5 minutes:
   `/usr/bin/php /home/<user>/domains/pottershouseoutreachministriesinternational.com/public_html/api/cron/inbox.php`
   If the PHP command doesn't work on your plan, use the URL instead:
   `curl -s "https://pottershouseoutreachministriesinternational.com/api/cron/inbox?token=<cron_token>"`
6. Check `https://pottershouseoutreachministriesinternational.com/api/health`. It shows whether the database and payments are on.

## 5. Payments

When the Yo! Payments (or Flutterwave) account is approved, fill in `payments` in `phomi-config.php` and set `provider`. Give the provider the notification URL:

- Yo! Payments: `https://pottershouseoutreachministriesinternational.com/api/webhook/yo?s=<ipn_secret>`
- Flutterwave: `https://pottershouseoutreachministriesinternational.com/api/webhook/flutterwave`, with the same secret hash as in the config

Test with UGX 500 on MTN and on Airtel, then check **Admin → Giving**.

## 6. Approving updates and undoing changes

- Every emailed update waits in **Admin → Emailed updates**. Approve or reject it there, or use the one-tap link in the alert email. Nothing appears on the site until someone approves it.
- **Admin → History & undo** lists every change (who, what, when). *Undo* puts things back the way they were. If the same item was changed again later, undo the later change first.
- Deleted photos, audio and video files stay on the server so a delete can be undone.

## 7. Videos

Post sermons and clips to the church's **YouTube** channel or **TikTok**, then add the link in **Admin → Videos** (or email it with the subject `Video:`). The video plays right on the Sermons and Home pages. Put the channel links in **Admin → Social links** so they show in the footer (they open in a new tab). TikTok share links (`vm.tiktok.com/…`) are turned into the full address when saved; if that fails, the site shows a *Watch on TikTok* button instead.

## 8. Bible, verse emails and SMS

- The installer loads the Bible text (KJV, WEB and the Luganda *Bayibuli Entukuvu*) from `api/data/`. Visitors who choose Luganda read the Luganda Bible, and people who sign up in Luganda get their verse emails and SMS in Luganda. If it did not, press *Load the Bible text* in **Admin → Daily verses**. The installer check list needs the **FreeType** (part of GD) and **zlib** extensions for the verse pictures.
- **Verse of the Day and Week** come from a planned list, never at random. To choose a verse for a date, use *Change* in **Admin → Daily verses**. Days with nothing planned use the built-in list of 252 verses grouped by theme, and 52 weekly verses.
- **Verse emails are off** until you switch on *Send verse emails* in **Admin → Settings → Bible, verse emails and SMS**. Set the send time (default 06:00). With *Send as planned*, each letter goes out by itself and can be paused first; with *Wait for approval*, nothing is sent until someone presses *Approve* in **Admin → Verse emails & SMS**.
- New sign-ups get a confirm email first (double opt-in). Every email has an unsubscribe link and the one-click unsubscribe header Gmail and Outlook use.
- Hostinger limits how many emails an hour a mailbox can send. `letters_per_hour` in `phomi-config.php` (default 100) spreads a big list over several hours. Ask Hostinger for your plan's limit and set it a little lower.
- **SMS is optional and paid.** Open an [Africa's Talking](https://africastalking.com) account, buy SMS credit, and ask for a sender ID (for example `PHOMI`). Fill in `sms` in `phomi-config.php` (`provider` = `africastalking`, `username`, `api_key`, `sender_id`), then switch on *Send the verse by SMS* in Settings. Test first with *Send today's verse to numbers* in **Admin → SMS list**. Without an account, the free *Send to a number* button on the site still works: it opens the reader's own SMS or WhatsApp app with the verse typed in.
- **WhatsApp Channel:** create a Channel from the church's WhatsApp, and put its link in **Admin → Settings → Bible, verse emails and SMS**. WhatsApp does not allow automatic posting to a Channel, so each morning use **Admin → Daily verses → Today**: copy the text or download the picture, and post it.

## 9. The private copy of the lists

People sign up with an email address, a phone number, or both. A phone number can ask for the SMS verse, for a call from the church, or both. No visitor ever makes a password.

In **Admin → Settings → Lists and sign-ups**, enter a **private email address**, such as the pastor's own Gmail, not the website mailbox. That address then gets:

- an email for each new sign-up. When someone ticks *Please call me*, the subject starts with "Please call:"
- both lists as spreadsheets every Monday morning (switch this off in the same place)
- both lists at any time, from **Email both lists now** in Admin → Email list or Phone list.

## 10. Getting found on Google

The site already gives Google what it needs: a title and description for each page, the church's address and Sunday times (schema.org), a `sitemap.xml`, a `robots.txt`, and redirects from the old WordPress addresses. After launch:

1. **Google Search Console**: add the domain, verify it with the TXT record in hPanel → DNS, and submit `/sitemap.xml`.
2. **Google Business Profile**: category *Church*, with the map pin, phone, website, Sunday hours and photos. For a local church, this brings the most visitors.
3. **Bing Webmaster Tools**: import from Search Console.
4. Put the website link on Facebook, WhatsApp, YouTube and TikTok, and keep posting sermons and events.

To change a page's title or description, edit `src/seo.js`. [GO-LIVE-WITH-CLAUDE-CODE.md](GO-LIVE-WITH-CLAUDE-CODE.md) (Phase 5) has every click.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `/admin` says the server is not set up | `phomi-config.php` is missing or in the wrong folder, or the database details are wrong. Open `/api/health` |
| Photos upload but look unchanged | The GD extension is off. Turn it on in PHP Configuration |
| "That file is too big for the server" | Raise `upload_max_filesize` and `post_max_size` |
| Emails are not picked up | Check the cron job. In Admin → Emailed updates press *Check mailbox now* to see the error. Check the sender is on the approved list |
| Verse emails not going out | Check *Send verse emails* is on in Settings, the cron job runs, and the letter is not *paused* or *waiting for approval* in Admin → Verse emails & SMS |
| SMS shows "failed" | Check the Africa's Talking credit, the username and key, and that the sender ID is approved |
| Replies from the website go to spam | Make sure SPF/DKIM are on for the domain (hPanel → Emails → DNS settings) |

## Languages and site text

- The **Luganda / English** button is in the menu bar on every page (next to the menu button on phones). A visitor's choice is remembered on their phone. A link ending in `?lang=lg` opens the site in Luganda.
- **Admin → Site text & language** holds every piece of wording on the site in English and Luganda. Search for any words, type the new wording, and choose a font, size, colour, bold or italic for it. *Use the built-in wording* puts it back, and **Admin → History & undo** keeps every change. The same page sets the whole-site fonts, main colours and text size, and the first language a new visitor sees.
- Ask a pastor or member who speaks Luganda well to read the Luganda wording once, and fix anything there.
