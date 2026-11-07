# Prompt for Claude Code: finish and launch the PHOMI website

Copy everything below the line into a Claude Code session that has the `formcraft/phomi-website` repository attached. Paste new information into the same session as you get it, for example "Here is the database name and FTP host" or "Yo! sandbox account is ready". Claude Code will take each item from there.

---

You are finishing and launching the website for **Potter's House Outreach Ministries International (PHOMI)**, a church in Burweta, Butebo District, Uganda. The live address is **https://pottershouseoutreachministriesinternational.com** and stays the same. It is hosted on **Hostinger** (shared hosting: Apache/LiteSpeed, PHP, MySQL, cron, Hostinger Email). The site currently on that domain is an old WordPress site. This repository replaces it.

## What already exists (read these first)

- `README.md`: how the project is laid out and how to run it.
- `docs/INFORMATION-NEEDED.md`: the checklist of accounts and church details the owner is collecting. Work through it with the owner, item by item.
- `docs/SETUP.md`: the step-by-step Hostinger launch guide.
- Frontend: React 18 + Vite + react-router (`src/`). Built-in content and fallbacks are in `src/data.js`. Live content comes from `/api/content` through `src/live.jsx`. The admin page is `src/admin/Admin.jsx` at `/admin`.
- Backend: plain PHP 8.1+ with no framework (`api/`). The router is `api/index.php`. The library code is in `api/lib/`: payments (Yo! Payments, Flutterwave, mock), email ingestion (its own IMAP client and MIME parser, tag parsing and keyword rules for untagged mail; every emailed item waits for admin approval), change history with undo (`history.php`), videos (YouTube, TikTok and Facebook links or MP4), media (GD resize and sharpen), settings (encrypted secrets) and auth (sessions plus an `X-PHOMI: 1` header check).
- Database: `api/schema.sql` (MySQL). The tests translate it to SQLite automatically.
- Tests: `python3 api/tests/test_api.py` (more than 60 API checks with SQLite, mock payments and a fake IMAP server) and `npm run build && node scripts/test-site.mjs` (Playwright, desktop and phone). Both must pass before every push.
- CI/deploy: `.github/workflows/deploy.yml` runs PHP lint, the API tests and the build, then uploads `dist/` to `/public_html/` over FTP. The upload runs only on `main` and only when the `FTP_*` secrets exist.

## Rules

1. **Never commit secrets.** Real values live only in `phomi-config.php` on the server (one folder above `public_html`) and in GitHub Actions secrets. If the owner pastes a secret into the chat, do not write it to any file in the repo. Tell them where to put it, give them the exact text to paste, and recommend rotating any key that was exposed.
2. Work on a branch and open a pull request. Don't push straight to `main`, because merging to `main` deploys the live site.
3. Before every push, run `python3 api/tests/test_api.py`, `npm run build` and `node scripts/test-site.mjs`. Add a test for every behaviour you change.
4. Keep the design: clay `#A03207`, navy `#1B2A47`, gold `#C99A3E`, Playfair Display, Poppins and Cinzel, and the Refined Seal logo. Keep the layout working at 390px with no sideways scroll.
5. Bible study at PHOMI is **free** and is a Bible study, not a school programme. Never add fees, tuition or "college/school" wording.
6. Do anything outward-facing only when the owner says so: the first deploy over the WordPress site, real payment tests, and messages to providers. Ask first, once.
7. Use British English in site copy. Keep the voice warm and plain.
8. **No AI at runtime.** The website must run on plain scripts only: never add an AI service, model call or API key to the site or its cron jobs.
9. **Humans approve.** Emailed updates always wait for an admin's approval, and every content or settings change must be recorded through `log_change()` so it can be undone in Admin → History & undo.
10. **No paid services the owner hasn't agreed to.** The owner will not pay for GitHub extras (no paid plan, no GitHub CLI). Use free GitHub Actions on the public repo, or manual upload.

## Things to verify that could not be tested without real accounts

- **Yo! Payments** (`api/lib/payments.php`, `yo_*`): confirm the XML request and response fields against the sandbox. That means `acdepositfunds` with `NonBlocking=TRUE`, `actransactioncheckstatus`, the `TransactionStatus` values, and the instant/failure notification fields. Confirm that MSISDN format `2567XXXXXXXX` is accepted. Put the sandbox endpoint in the config. Run a real UGX 500 test on MTN and on Airtel once the live account is approved.
- **Flutterwave** (`flw_*`): confirm the `mobile_money_uganda` charge flow. The response returns `meta.authorization.redirect`, which the Give page opens in a new tab. Also confirm `verify_by_reference` and the `verif-hash` webhook header.
- **Hostinger specifics**: the PHP binary path for the cron job; whether `mail()` from `church@…` lands in inboxes (if not, add SMTP sending through `smtp.hostinger.com:465` with the mailbox password stored encrypted in settings); upload size limits; whether the `exif` extension is on.
- **IMAP**: the client in `api/lib/imap.php` is tested against a fake server. Test it against `imap.hostinger.com:993` with the real mailbox, including a large video attachment (memory and time limits).

## Launch steps, as the owner provides each item

1. **Hosting details arrive** (database, FTP, PHP version). Give the owner the exact `phomi-config.php` contents to paste, with placeholders for anything they don't have yet. Tell them which GitHub secrets to add. Remind them to back up WordPress first.
2. **First deploy.** Once the owner confirms the backup is done and says go: merge the PR. Watch the Actions run. Have the owner open `/api/install.php?token=…`, create the first admin and fix anything the checks flag. Then confirm `/api/health` shows `database: true`. Old WordPress files left in `public_html` (`wp-*`, `xmlrpc.php`) should be removed after the backup is confirmed; ask before suggesting it.
3. **Mailbox and cron.** Guide them through creating the update mailbox, entering it in Admin → Settings, adding approved senders and the 5-minute cron job. Then send test emails for each tag and check them in Admin → Emailed updates.
4. **Payments.** Set up the sandbox first with `provider` = `yo` (or `flutterwave`) and the sandbox endpoint. Make real small payments only with the owner's go-ahead. Check the Give page on a real phone: type the number, get the PIN prompt, see "Thank you", and see the gift appear in Admin → Giving.
5. **Videos.** Once the church's YouTube channel and TikTok exist, add the links in Admin → Settings → Video and social pages, and add the first videos in Admin → Videos (or by email with "Video:"). Check one TikTok and one YouTube video play on a real phone.
6. **Church content** (section 7 of the checklist). Times, contacts and giving numbers go in through Admin → Settings, not code. Leadership, directions and any copy changes are code changes in `src/pages/*` or `src/data.js` through a PR. Remove each gold "to confirm" highlight (`<Tbc>`) as its content arrives.
7. **Hardening after launch**: add a daily database backup reminder (Hostinger backups) and check the PHP error log in the first week. Optionally add the WhatsApp Business route: a Meta WhatsApp Cloud API webhook at `/api/webhook/whatsapp` that feeds `ingest`, using the same tags and approved-sender rules.

Report progress to the owner in plain language. Say what you did, what you checked, and what you need from them next. Ask for one thing at a time.
