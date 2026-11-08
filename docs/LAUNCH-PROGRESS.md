# Launch progress

Where the go-live stands, so a new Claude Code session can carry on. Follows [GO-LIVE-WITH-CLAUDE-CODE.md](GO-LIVE-WITH-CLAUDE-CODE.md). No passwords, keys or private contact details in this file.

## Decisions

- 2026-11-08: The owner wants the old WordPress site **fully removed**. Instead of keeping `old-wordpress` for a month (Phase 3 and 7), delete the WordPress files and the WordPress database on launch day, once the new site is live and checked. Old addresses keep working through the 301 redirects in `public/.htaccess`.
- 2026-11-08: Church P.O. Box is **P.O. Box 260208, Pallisa** (was 1972, Mbale): PR #2. Church account number given by the owner goes in Admin → Settings → Giving details (database), bank name still to be typed in by the owner.
- 2026-11-08: The owner chose **no backup download** of WordPress (and so no export of the GiveWP donation records). They were told the deletion then cannot be undone, except from any automatic backup Hostinger itself still holds.

## Found so far

- The live domain still runs WordPress (LiteSpeed, PHP 8.3, Elementor, AIOSEO, GiveWP). `/api/health` is 404, so the new site is not on the server yet.
- Old WordPress pages without a redirect yet: `/about-2`, `/contact-2`, `/donation-confirmation`, `/donation-confirmation-2`, `/donation-failed`, `/donation-failed-2`, `/donor-dashboard`, `/donor-dashboard-2`. To add in Phase 1, with a test.

## Open questions

- The Premium plan holds three websites: the main domain (WordPress, created 2025-12-28, the one we replace), `church.` (Coming Soon), and **formcraftdesign.com** (the owner's company site: never touch it). Always check the website name at the top left of hPanel before saving.
- hPanel has a second website, `church.pottershouseoutreachministriesinternational.com`, showing a WordPress "Coming Soon" page. Ask the owner after launch whether to remove it too. Never deploy to it by mistake: the FTP account and folder must be the main domain's.

## Steps

| Date | Phase | Step | Status | Still missing |
| --- | --- | --- | --- | --- |
| 2026-11-08 | 0 | Latest code, checks pass | done | Two Windows-only test fixes made on the branch (API test folder link and server log; two site checks waited too little) |
| 2026-11-08 | 0 | Owner has tried the site locally, nothing left to change | done | Owner said "go live", no changes |
| 2026-11-08 | 0 | hPanel and GitHub sign-in, Hostinger plan name | done | Premium Web Hosting (PHP, MySQL, cron, email; no SSH, not needed). GitHub sign-in checked in Phase 3 |
| 2026-11-08 | 1 | WordPress backup downloaded and opened | skipped | Owner's choice, after being told it cannot be undone |
| 2026-11-08 | 1 | GiveWP donation records exported (if needed) | skipped | Goes with the backup decision |
| 2026-11-08 | 1 | Redirects for every old address | done | The 8 addresses above now go to /about, /contact or /give. test-phone checks every old sitemap page |
| 2026-11-08 | 1 | Domain mailboxes noted | done | Owner has a paid Hostinger Email plan, set-up failed before. DNS checked: MX = Hostinger, SPF ok, DMARC p=none, DKIM not found (fix in Phase 4). A google-site-verification TXT already exists (Phase 5). Mailbox: church@ (matches mail_from in the config sample) |
| 2026-11-08 | 2 | PHP settings | done | Checked from screenshots of the main domain: PHP 8.3, all extensions on, max_execution_time 120, memory_limit 1536M, post_max_size 1024M, upload_max_filesize 1024M. Timezone UTC is fine (the app sets Africa/Kampala). No disabled function is used by api/. Earlier the settings went to church. by mistake. Owner first opened the **church.** subdomain website (a separate WordPress "Coming Soon" site, its own IP). Settings must be on the main domain's website. Extensions on church. were fine; memory_limit goes up to 1536M, 256M is enough |
| 2026-11-08 | 2 | Database and user | done | Database and user: u131175825_phomi (password kept by the owner only) |
| 2026-11-08 | 2 | phomi-config.php on the server | done | Goes in /home/u131175825/domains/pottershouseoutreachministriesinternational.com/ (one above public_html). Keys were given in the chat only, never in the repo. Payments and SMS empty |
| 2026-11-08 | 2 | SSL and Force HTTPS | done | Checked from here: Let's Encrypt for the domain and www, valid to 2027-01-23; http already 301s to https |
| 2026-11-08 | 3 | GitHub FTP secrets | done | Owner added FTP_SERVER, FTP_USERNAME, FTP_PASSWORD. Branch pushed (gh login for formcraft got the workflow scope); PR #1 checks green. Main FTP account of the main domain: server 72.60.93.183 (= ftp.<domain>), user u131175825.<domain>. Server supports FTPS (AUTH TLS); the deploy uses plain FTP for now. Owner types the three secrets into GitHub. Deploy now only uploads from main |
| 2026-11-08 | 3 | Remove WordPress files from public_html | done | Moved into old-wordpress beside public_html (delete for good after the live checks). .private left in place. | No backup (owner's choice). Tell the owner the site is offline for a few minutes until the deploy finishes |
| 2026-11-08 | 3 | Merge to main and deploy | done | PR #1 merged (12c2939). First upload failed: FTP_SERVER secret had extra characters; owner fixed it, rerun green. Live: home 200, /api/health database true, old addresses 301, api/lib 403. /phomi-config.php gives the home page (no secrets), not 404 |
| 2026-11-08 | 3 | Installer and admin account | done | Owner ran the installer, admin formcraftinc@gmail.com created (password known only to the owner). Checked live: KJV, WEB and Luganda (with Biblica credit) answer; CSP, HSTS, nosniff, frame headers on; /wp-login.php 410. Next: remove install_token from phomi-config.php |
| | 3 | Live checks, testimonies, languages, social links | to do | |
| | 3 | Luganda read by a native speaker | to do | Who? |
| | 3 | Delete the old WordPress files and database for good | to do | After the live checks pass |
| | 4 | Update mailbox, sending, cron, alerts, verse emails | to do | |
| | 5 | Google Search Console, Business Profile, Bing, sharing | to do | |
| | 6 | Giving and SMS | to do | Accounts not open yet |
| | 7 | Hand-over | to do | |
