# Go live on Hostinger, step by step with Claude Code

First try the site on your computer with [LOCAL-PREVIEW.md](LOCAL-PREVIEW.md). When you are happy with it, open Claude Code in the same `phomi-website` folder and paste everything below the line. Paste new information into the same session as you get it, for example "Here is the database name and FTP host" or "Yo! sandbox account is ready". Claude Code will take each item from there.

---

You are finishing and launching the website for **Potter's House Outreach Ministries International (PHOMI)**, a church in Burweta, Butebo District, Uganda. The live address is **https://pottershouseoutreachministriesinternational.com** and stays the same. It is hosted on **Hostinger** (shared hosting: Apache/LiteSpeed, PHP, MySQL, cron, Hostinger Email). The site currently on that domain is an old WordPress site. This repository replaces it.

## What already exists (read these first)

- `README.md`: how the project is laid out and how to run it.
- `docs/INFORMATION-NEEDED.md`: the checklist of accounts and church details the owner is collecting. Work through it with the owner, item by item.
- `docs/SETUP.md`: the step-by-step Hostinger launch guide.
- `docs/LOCAL-PREVIEW.md`: `npm run local` runs the whole site on this computer; `npm run test:phone` checks every page on phones, offline, plus security and search checks.
- Search: `src/seo.js` holds every page's title and description and the church details for Google; `scripts/seo-build.mjs` writes one HTML file per page, `sitemap.xml` and `robots.txt` at build time. `public/.htaccess` redirects old WordPress addresses.
- Frontend: React 18 + Vite + react-router (`src/`). Built-in content and fallbacks are in `src/data.js`. Live content comes from `/api/content` through `src/live.jsx`. The admin page is `src/admin/Admin.jsx` at `/admin`.
- Backend: plain PHP 8.1+ with no framework (`api/`). The router is `api/index.php`. The library code is in `api/lib/`: payments (Yo! Payments, Flutterwave, mock), email ingestion (its own IMAP client and MIME parser, tag parsing and keyword rules for untagged mail; every emailed item waits for admin approval), change history with undo (`history.php`), videos (YouTube, TikTok and Facebook links or MP4), media (GD resize and sharpen), the Bible (`bible.php`: KJV and WEB text in `api/data/`, reference parsing, search, the planned Verse of the Day/Week and GD verse pictures), verse emails (`letters.php`: double opt-in list, daily and Monday letters, hourly sending budget), SMS (`sms.php`: Africa's Talking or a mock), settings (encrypted secrets) and auth (sessions plus an `X-PHOMI: 1` header check).
- Database: `api/schema.sql` (MySQL). The tests translate it to SQLite automatically.
- Tests: `python3 api/tests/test_api.py` (more than 60 API checks with SQLite, mock payments and a fake IMAP server) `npm run build && node scripts/test-site.mjs` (Playwright, desktop and phone) and `node scripts/test-phone.mjs` (phones, offline, security, search). All must pass before every push.
- CI/deploy: `.github/workflows/deploy.yml` runs PHP lint, the API tests and the build, then uploads `dist/` to `/public_html/` over FTP. The upload runs only on `main` and only when the `FTP_*` secrets exist.

## Rules

1. **Never commit secrets.** Real values live only in `phomi-config.php` on the server (one folder above `public_html`) and in GitHub Actions secrets. If the owner pastes a secret into the chat, do not write it to any file in the repo. Tell them where to put it, give them the exact text to paste, and recommend rotating any key that was exposed.
2. Work on a branch and open a pull request. Don't push straight to `main`, because merging to `main` deploys the live site.
3. Before every push, run `python3 api/tests/test_api.py`, `npm run build`, `node scripts/test-site.mjs` and `node scripts/test-phone.mjs`. Add a test for every behaviour you change.
4. Keep the design: clay `#A03207`, navy `#1B2A47`, gold `#C99A3E`, Playfair Display, Poppins and Cinzel, and the Refined Seal logo. Keep the layout working at 390px with no sideways scroll.
5. Bible study at PHOMI is **free** and is a Bible study, not a school programme. Never add fees, tuition or "college/school" wording.
6. Do anything outward-facing only when the owner says so: the first deploy over the WordPress site, real payment tests, and messages to providers. Ask first, once.
7. Use British English in site copy. Keep the voice warm and plain.
8. **No AI at runtime.** The website must run on plain scripts only: never add an AI service, model call or API key to the site or its cron jobs.
9. **Humans approve.** Emailed updates always wait for an admin's approval, and every content or settings change must be recorded through `log_change()` so it can be undone in Admin → History & undo.
10. **The Verse of the Day is never random.** It comes from a planned `verses` row or the fixed built-in list. Mailing lists stay double opt-in with a working unsubscribe, and SMS only goes to numbers that signed up or that an admin added.
11. **No paid services the owner hasn't agreed to.** The owner will not pay for GitHub extras (no paid plan, no GitHub CLI). Use free GitHub Actions on the public repo, or manual upload.

## Things to verify that could not be tested without real accounts

- **Yo! Payments** (`api/lib/payments.php`, `yo_*`): confirm the XML request and response fields against the sandbox. That means `acdepositfunds` with `NonBlocking=TRUE`, `actransactioncheckstatus`, the `TransactionStatus` values, and the instant/failure notification fields. Confirm that MSISDN format `2567XXXXXXXX` is accepted. Put the sandbox endpoint in the config. Run a real UGX 500 test on MTN and on Airtel once the live account is approved.
- **Flutterwave** (`flw_*`): confirm the `mobile_money_uganda` charge flow. The response returns `meta.authorization.redirect`, which the Give page opens in a new tab. Also confirm `verify_by_reference` and the `verif-hash` webhook header.
- **Hostinger specifics**: the PHP binary path for the cron job; whether `mail()` from `church@…` lands in inboxes (if not, add SMTP sending through `smtp.hostinger.com:465` with the mailbox password stored encrypted in settings); upload size limits; whether the `exif` extension is on.
- **Africa's Talking SMS** (`api/lib/sms.php`): confirm the `/version1/messaging` request and the `SMSMessageData.Recipients[].status` values in the sandbox, then a real send to one number with the owner's go-ahead. Confirm the sender ID is approved for Uganda.
- **Email volume**: Hostinger's hourly sending limit for the plan; set `letters_per_hour` below it.
- **IMAP**: the client in `api/lib/imap.php` is tested against a fake server. Test it against `imap.hostinger.com:993` with the real mailbox, including a large video attachment (memory and time limits).

## How to run the launch

Work through the phases below **in order**, one step at a time. At the start, show the owner the list of phases with a tick for each one already done (check the repository, `/api/health` and what the owner tells you), and continue from the first one that isn't done.

For each step: say in two or three plain sentences what it is for, give the exact clicks in Hostinger hPanel or GitHub (the owner is not technical), then **stop and wait** until the owner says it is done or pastes what you asked for. Check it yourself wherever you can (open the URL, run a command, read the Actions log) before moving on. Never ask for more than one thing at a time. If the owner pastes a password or key, don't save it anywhere. Tell them where it goes instead, and suggest changing it if it was shared somewhere public.

Keep a short progress list in `docs/LAUNCH-PROGRESS.md` on the branch: date, phase, step, done or waiting, and what is still missing. Never put secrets in it. Commit it as you go, so a new session can pick up where this one stopped.

### Phase 0: Ready to start
1. Confirm the owner has tried the site locally (`npm run local`) and has nothing left to change before launch. Anything they want changed: make it on the branch, with tests, before Phase 3.
2. Confirm they can sign in to **hPanel** (hpanel.hostinger.com) and to **GitHub** as `formcraft`, and which Hostinger plan they have. It needs PHP, MySQL, cron jobs and email; Premium or Business shared hosting has all of these.

### Phase 1: Protect the old site (nothing changes for visitors yet)
1. **Full backup of WordPress.** hPanel → Websites → the domain → Files → Backups: generate a new backup, then download both the files backup and the database backup to the owner's computer. Ask them to confirm the two downloads open (they are .zip / .sql.gz files) before going on. *Nothing in Phase 3 may start until this is confirmed.*
2. **Note the old page addresses.** Ask the owner to send the list of pages from WordPress (WP Admin → Pages), or open the old sitemap (`/wp-sitemap.xml` or `/sitemap_index.xml`) together. For any address that isn't already in the redirect list in `public/.htaccess`, add a 301 redirect to the matching new page, with a test.
3. If the WordPress site uses the domain's email (`church@…`), note which mailboxes exist (hPanel → Emails). They keep working, because email is separate from the website files.

### Phase 2: Hosting settings
1. **PHP**: hPanel → Advanced → PHP Configuration. Choose 8.2 or 8.3. Turn on the extensions `curl, gd, mbstring, fileinfo, openssl, pdo_mysql, zip`. Set `upload_max_filesize` and `post_max_size` to 128M, `memory_limit` to 256M and `max_execution_time` to 120.
2. **Database**: hPanel → Databases → Management → create a database and a user. The owner keeps the name, user and password for the next step. Don't paste the password into the chat.
3. **Settings file**: build `phomi-config.php` for them from `api/config.sample.php`. Make a long random `app_key`, `install_token` and `cron_token` (`php -r "echo bin2hex(random_bytes(32));"`), and leave placeholders only for the database password. Tell them to create it in hPanel → Files → File Manager, **one folder above `public_html`**, paste the contents, and type the database password in themselves. Leave `payments.provider` and `sms.provider` empty for now.
4. **SSL**: hPanel → Security → SSL: make sure the domain has an active certificate (Hostinger's free one is fine) and that "Force HTTPS" is on.

### Phase 3: Put the new site live
1. **GitHub secrets**: hPanel → Files → FTP Accounts (create one if needed). github.com/formcraft/phomi-website → Settings → Secrets and variables → Actions → add `FTP_SERVER`, `FTP_USERNAME` and `FTP_PASSWORD`. The owner types these into GitHub themselves.
2. **Clear out WordPress**, only after Phase 1 is confirmed. Tell the owner the site will be offline for a few minutes, until step 3 finishes. In File Manager, move the old WordPress files out of `public_html` into a folder named `old-wordpress` *beside* it (not inside it). Don't delete them yet. Leave `public_html` empty, except for `.well-known` if it is there.
3. **Merge**: with the owner's go-ahead, merge the pull request into `main`. Watch the Actions run until the upload step is green. If it fails, read the log, fix it on a branch and try again. If FTP is refused, check the secrets (the server is usually the FTP IP shown in hPanel).
4. **Installer**: the owner opens `https://pottershouseoutreachministriesinternational.com/api/install.php?token=<install_token>`. Every line must show ✅, including "Bible text loaded". Fix anything that shows ❌ (usually a PHP extension, or the database details). They then create their own admin account with a strong password they keep. After that, remove `install_token` from `phomi-config.php`.
5. **Check it works**: open `/api/health` (database: true), the home page, `/bible?ref=John+3:16` and `/admin` on the owner's phone. From this computer, run `curl -sI` against the live site: the home page (status 200, `content-security-policy` and `strict-transport-security` headers), `/about-us` (301 to `/about`), `/api/lib/db.php` (403) and `/phomi-config.php` (404).

### Phase 4: Email and the 5-minute job
1. **Update mailbox**: hPanel → Emails → create e.g. `updates@…` (or use `church@…`). Admin → Settings → Update mailbox: enter the address and its password, and press *Save and test the mailbox*.
2. **Sending**: hPanel → Emails → the domain → DNS / Deliverability. SPF, DKIM and DMARC should all be on. Send a test from the Contact form to the owner's Gmail, and check it lands in the inbox, not spam. If it lands in spam, add SMTP sending (see "Things to verify").
3. **Cron**: hPanel → Advanced → Cron Jobs → every 5 minutes, using the command in `docs/SETUP.md`. Check it with *Check mailbox now* in Admin → Emailed updates, and by emailing a `Sermon:` test from an approved sender.
4. **Approved senders and alerts**: Admin → Approved senders. Admin → Settings: alert address, and the **private list address** (Lists and sign-ups). That must be a private email such as the pastor's Gmail, not the hosting mailbox.
5. **Verse emails**: sign up on the site with the owner's own email, confirm it, then switch on *Send verse emails* in Settings. The next morning, check the email arrived and its unsubscribe link works. Ask the owner how many emails an hour their plan allows, and set `letters_per_hour` below that.

### Phase 5: Found on Google
1. **Google Search Console** (search.google.com/search-console) with the church Google account. Add a **Domain** property for the domain. Google gives a TXT record: hPanel → Domains → DNS / Nameservers → add the TXT record. Wait for verification (minutes to a few hours).
2. Search Console → Sitemaps → submit `https://pottershouseoutreachministriesinternational.com/sitemap.xml`. Then URL Inspection → the home page → *Request indexing*. Do the same for `/bible`, `/about` and `/contact`.
3. **Google Business Profile** (business.google.com). This brings the most visitors for a local church, because it puts the church on Google Maps and in "church near me" searches. Category: *Church*. Add the address, a map pin (ask the owner to drop it on the church building), phone, website, Sunday hours, and 5 or more real photos. Google verifies it by phone, video or post. Ask the owner to ask members to leave honest reviews.
4. **Bing Webmaster Tools** (bing.com/webmasters): *Import from Google Search Console*. That takes one click once Phase 5.1 is done.
5. **Share the address**: put the website link on the Facebook page, the WhatsApp business profile and Channel, YouTube and TikTok bios. Links from these help Google trust the site. Paste the home page link into WhatsApp to check that the preview shows the church picture and description.
6. **Check the page details**: test the home page in Google's Rich Results Test (search.google.com/test/rich-results). It should find "Church" (LocalBusiness). If the owner confirms the exact service times, prayer day, a second weekly service or a map pin (latitude/longitude), update `src/seo.js` (`churchSchema`) and `src/data.js` through a PR.
7. **Keep it fresh**: explain that Google ranks sites that change. Posting sermons, events and photos (by email or the admin page) each week is the best ongoing SEO. Events added in the admin page are shown to Google as events automatically.
8. After 2 to 4 weeks, open Search Console → Pages and Performance together. Fix any "not indexed" reasons, and note which searches bring people.

### Phase 6: Giving and SMS (when the accounts exist)
1. **Payments**: sandbox first with `provider` = `yo` (or `flutterwave`). Make real UGX 500 tests on MTN and Airtel **only with the owner's go-ahead**. Check the gift appears in Admin → Giving.
2. **SMS** (optional, paid): only after the owner opens an Africa's Talking account and the sender ID is approved. Make one test send to the owner's phone first.

### Phase 7: Hand-over
1. Walk the owner through a normal week in the admin: approving an emailed update, planning next week's verses, posting today's verse to the WhatsApp Channel, and reading prayer requests.
2. hPanel → Backups: confirm daily backups are on. Check the PHP error log (hPanel → Advanced → Error logs) after the first week.
3. After a month with no problems, and with the owner's go-ahead, delete the `old-wordpress` folder and the old WordPress database.
4. Update `docs/LAUNCH-PROGRESS.md` to "Live", and list anything still waiting (for example, the payment account).

Report progress to the owner in plain language. Say what you did, what you checked, and what you need from them next. Ask for one thing at a time.
