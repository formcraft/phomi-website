# Potter's House Outreach Ministries International: website

The website for PHOMI (Church & Bible Study), Burweta, Butebo District, Uganda.
It lives at **https://pottershouseoutreachministriesinternational.com** and is hosted on **Hostinger**.

- **Website:** React + JavaScript with [Vite](https://vite.dev) (`src/`)
- **Backend:** plain PHP 8.1+ and MySQL, which every Hostinger plan runs (`api/`)
- **Admin page:** `/admin`, for sermons, videos, gallery, events, announcements, testimonies, giving, prayer requests and settings, with a **History & undo** list of every change
- **Automatic updates:** approved people email the church update address with a tag such as `Sermon:` or `Photo: Outreach`. An admin approves each one (in the admin page or with a one-tap link) before it shows on the site.
- **Videos:** YouTube, TikTok and Facebook links play right on the page; uploaded MP4 clips work too.
- **No AI at runtime:** everything runs on plain PHP scripts and rules. Nothing needs an AI service or an API key to work.
- **Bible:** the whole Bible (KJV and World English Bible, both public domain) at `/bible`, with search, a Verse of the Day and a Verse of the Week from a planned list (never random), share pictures, and *Send to a number* by SMS or WhatsApp from the reader's own phone.
- **Verse emails and SMS:** members sign up for a morning verse email, a Monday letter (Verse of the Week, latest sermon, coming events) and an optional SMS. Sent by the cron job; an admin can pause, approve or add a message to each one.
- **Giving:** the giver types their MTN or Airtel number and gets the Mobile Money PIN prompt on their phone (Yo! Payments or Flutterwave). Until a payment account is live, the page falls back to the dial code.

**Launching?** Start with [docs/INFORMATION-NEEDED.md](docs/INFORMATION-NEEDED.md), then follow [docs/SETUP.md](docs/SETUP.md).
To have Claude Code finish the launch, use [docs/CLAUDE-CODE-PROMPT.md](docs/CLAUDE-CODE-PROMPT.md).

## Run it on your computer

You need [Node.js](https://nodejs.org) 20+ and PHP 8.1+ (with pdo_sqlite, gd, curl, mbstring, fileinfo). No PHP libraries to install.

```bash
npm install
npm run dev                         # the website at http://localhost:5173 (built-in content only)
npm run build                       # the finished site, backend included, in dist/
npm run test:api                    # backend tests: SQLite, mock payments, fake mailbox
npm run test:site                   # browser tests of the built site, desktop and phone (needs Playwright)
```

## How the pieces fit

```
Visitor's browser ──► index.html + React (dist/)
                         │  loads /api/content (sermons, photos, events, announcements, times)
                         │  posts /api/give, /api/prayer, /api/contact
                         ▼
                    api/index.php ──► MySQL
                         ▲      └──► Yo! Payments / Flutterwave  ──►  PIN prompt on the giver's phone
Cron every 5 min ──► api/cron/inbox.php ──► church update mailbox (IMAP) ──► waits in Admin → Emailed updates for approval
```

If the backend can't be reached, the site still works with the built-in content in `src/data.js`.

## Where to change things

| What | Where |
| --- | --- |
| Sermons, videos, gallery photos, events, announcements, testimonies | **Admin page**, or email the update address |
| Undo a change (edit, delete, approval, settings) | **Admin → History & undo** |
| YouTube channel, TikTok, Facebook, Instagram links | **Admin → Settings → Video and social pages** |
| Service times, phone numbers, WhatsApp, Mobile Money and bank details | **Admin → Settings** (overrides `src/data.js`) |
| Verse of the Day / Week for a date | **Admin → Daily verses** (otherwise the built-in list in `api/lib/bible.php`) |
| Verse emails and SMS: on/off, send time, approval | **Admin → Settings → Bible, verse emails and SMS**; each letter in **Admin → Verse emails & SMS** |
| Email list and SMS list | **Admin → Email list / SMS list** (CSV download on each) |
| Approved senders and who gets alerts | **Admin → Approved senders / Settings** |
| Built-in photos and videos | `public/img/`, `public/video/` + `src/data.js` → `PHOTOS`, `CLIPS` |
| Page text | `src/pages/*.jsx` |
| Colours, fonts, layout | `src/styles.css` (admin: `src/admin/admin.css`) |
| Logo (Refined Seal) | `src/components/Seal.jsx`, pot artwork in `public/img/pot.png` |
| Server settings and keys | `phomi-config.php` on the server (template: `api/config.sample.php`); never in GitHub |
| Database tables | `api/schema.sql` (re-run `/api/install.php?token=…` after adding tables) |

Text the church still needs to supply shows with a gold highlight (the `<Tbc>` component). Search for `Tbc` to find each one.

## Emailed updates

| Subject starts with | Goes to |
| --- | --- |
| `Sermon: Title` | Sermons. Attach audio or video, or paste a YouTube, TikTok or Facebook link. Lines like `Preacher:`, `Scripture:`, `Date:` fill the details |
| `Photo: Outreach, caption` | Gallery, under the category named first |
| `Event: Name` | Events. Use `Date:`, `Time:`, `Venue:` lines |
| `Announcement: Headline` | Banner on every page. `Until:` sets the end date |
| `Times: …` | Weekly times. `Prayer day:`, `Prayer time:`, `Bible study day:`… |
| `Video: Outreach, title` | Videos (Recent Moments on the Sermons and Home pages). Paste YouTube, TikTok or Facebook links, or attach an MP4 |
| `Testimony: Headline` | Testimonies |

Only senders on the approved list are accepted. **Nothing goes live by itself:** every emailed update waits until an admin approves it in Admin → Emailed updates or with the one-tap link in the alert email. Emails without a tag are sorted by simple keyword rules and marked for a closer look. Every change is recorded in Admin → History & undo, where it can be reversed.

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`: PHP lint, API tests, build, then an FTP upload of `dist/` to `public_html`. The upload needs the repository secrets `FTP_SERVER`, `FTP_USERNAME` and `FTP_PASSWORD`, and is skipped until they exist. Pull requests run the tests only. GitHub Actions is free for this public repository, and nothing else on GitHub needs to be paid for (the GitHub command-line tool is not needed). You can also skip GitHub uploads entirely and upload `dist/` by hand. Full steps are in [docs/SETUP.md](docs/SETUP.md).
