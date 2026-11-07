# Potter's House Outreach Ministries International: website

The website for PHOMI (Church & Bible Study), Burweta, Butebo District, Uganda.
It lives at **https://pottershouseoutreachministriesinternational.com** and is hosted on **Hostinger**.

- **Website:** React + JavaScript with [Vite](https://vite.dev) (`src/`)
- **Backend:** plain PHP 8.1+ and MySQL, which every Hostinger plan runs (`api/`)
- **Admin page:** `/admin`, for sermons, gallery, events, announcements, testimonies, giving, prayer requests and settings
- **Automatic updates:** approved people email the church update address with a tag such as `Sermon:` or `Photo: Outreach`, and the site publishes it. Claude reads untagged emails and writes captions.
- **Giving:** the giver types their MTN or Airtel number and gets the Mobile Money PIN prompt on their phone (Yo! Payments or Flutterwave). Until a payment account is live, the page falls back to the dial code.

**Launching?** Start with [docs/INFORMATION-NEEDED.md](docs/INFORMATION-NEEDED.md), then follow [docs/SETUP.md](docs/SETUP.md).
To have Claude Code finish the launch, use [docs/CLAUDE-CODE-PROMPT.md](docs/CLAUDE-CODE-PROMPT.md).

## Run it on your computer

You need [Node.js](https://nodejs.org) 20+, PHP 8.1+ (with pdo_sqlite, gd, curl, mbstring, fileinfo) and [Composer](https://getcomposer.org).

```bash
npm install
npm run dev                         # the website at http://localhost:5173 (built-in content only)
(cd api && composer install)        # PHP libraries (Anthropic SDK for the email reader)
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
Cron every 5 min ──► api/cron/inbox.php ──► church update mailbox (IMAP) ──► Claude (untagged mail)
```

If the backend can't be reached, the site still works with the built-in content in `src/data.js`.

## Where to change things

| What | Where |
| --- | --- |
| Sermons, gallery photos, events, announcements, testimonies | **Admin page**, or email the update address |
| Service times, phone numbers, WhatsApp, Mobile Money and bank details | **Admin → Settings** (overrides `src/data.js`) |
| Approved senders, alert email, publish straight away or after approval | **Admin → Approved senders / Settings** |
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
| `Sermon: Title` | Sermons. Attach audio or video, or paste a YouTube link. Lines like `Preacher:`, `Scripture:`, `Date:` fill the details |
| `Photo: Outreach, caption` | Gallery, under the category named first |
| `Event: Name` | Events. Use `Date:`, `Time:`, `Venue:` lines |
| `Announcement: Headline` | Banner on every page. `Until:` sets the end date |
| `Times: …` | Weekly times. `Prayer day:`, `Prayer time:`, `Bible study day:`… |
| `Testimony: Headline` | Testimonies (always checked first) |

Only senders on the approved list are accepted. Each sender gets a reply with the link. Items waiting for approval send the office a one-tap approve link.

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`: PHP libraries, PHP lint, API tests, build, then an FTP upload of `dist/` to `public_html`. The upload needs the repository secrets `FTP_SERVER`, `FTP_USERNAME` and `FTP_PASSWORD`, and is skipped until they exist. Pull requests run the tests only. Full steps are in [docs/SETUP.md](docs/SETUP.md).
