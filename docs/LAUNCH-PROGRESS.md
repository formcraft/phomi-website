# Launch progress

Where the go-live stands, so a new Claude Code session can carry on. Follows [GO-LIVE-WITH-CLAUDE-CODE.md](GO-LIVE-WITH-CLAUDE-CODE.md). No passwords, keys or private contact details in this file.

## Decisions

- 2026-11-08: The owner wants the old WordPress site **fully removed**. Instead of keeping `old-wordpress` for a month (Phase 3 and 7), delete the WordPress files and the WordPress database once the new site is live and checked. Before that: one full backup downloaded to the owner's computer, and the GiveWP donation records exported if the church needs them. Old addresses keep working through the 301 redirects in `public/.htaccess`.

## Found so far

- The live domain still runs WordPress (LiteSpeed, PHP 8.3, Elementor, AIOSEO, GiveWP). `/api/health` is 404, so the new site is not on the server yet.
- Old WordPress pages without a redirect yet: `/about-2`, `/contact-2`, `/donation-confirmation`, `/donation-confirmation-2`, `/donation-failed`, `/donation-failed-2`, `/donor-dashboard`, `/donor-dashboard-2`. To add in Phase 1, with a test.

## Steps

| Date | Phase | Step | Status | Still missing |
| --- | --- | --- | --- | --- |
| 2026-11-08 | 0 | Latest code, checks pass | done | Two Windows-only test fixes made on the branch (API test folder link and server log; two site checks waited too little) |
| 2026-11-08 | 0 | Owner has tried the site locally, nothing left to change | waiting | |
| | 0 | hPanel and GitHub sign-in, Hostinger plan name | to do | |
| | 1 | WordPress backup downloaded and opened | to do | |
| | 1 | GiveWP donation records exported (if needed) | to do | |
| | 1 | Redirects for every old address | to do | The 8 addresses above |
| | 1 | Domain mailboxes noted | to do | |
| | 2 | PHP settings | to do | |
| | 2 | Database and user | to do | |
| | 2 | phomi-config.php on the server | to do | |
| | 2 | SSL and Force HTTPS | to do | |
| | 3 | GitHub FTP secrets | to do | |
| | 3 | Remove WordPress files from public_html | to do | Only after the backup is confirmed |
| | 3 | Merge to main and deploy | to do | |
| | 3 | Installer and admin account | to do | |
| | 3 | Live checks, testimonies, languages, social links | to do | |
| | 3 | Luganda read by a native speaker | to do | Who? |
| | 3 | Delete the old WordPress files and database for good | to do | After the live checks pass |
| | 4 | Update mailbox, sending, cron, alerts, verse emails | to do | |
| | 5 | Google Search Console, Business Profile, Bing, sharing | to do | |
| | 6 | Giving and SMS | to do | Accounts not open yet |
| | 7 | Hand-over | to do | |
