# Launching on Hostinger

The whole website, the PHP backend included, is built into `dist/` and uploaded to `public_html`. The real settings live in one file **outside** `public_html`, so they are never uploaded and never in GitHub.

```
/home/<user>/domains/pottershouseoutreachministriesinternational.com/
├── phomi-config.php        ← your settings (copy of api/config.sample.php, filled in)
└── public_html/
    ├── index.html, assets/, img/, video/   ← the website
    ├── api/                                ← the PHP backend (index.php, lib/, cron/, vendor/)
    └── uploads/                            ← photos, audio and video added later (created automatically)
```

## 1. Before you start

1. **Back up the current WordPress site** (hPanel → Files → Backups: download the files and the database).
2. Set PHP to **8.2 or 8.3** with the extensions **curl, gd, mbstring, fileinfo, openssl, pdo_mysql**. Raise `upload_max_filesize` and `post_max_size` to 128M (hPanel → Advanced → PHP Configuration).
3. Create a **MySQL database** (hPanel → Databases).

## 2. Settings file

Create `phomi-config.php` one folder above `public_html` (File Manager), using [`api/config.sample.php`](../api/config.sample.php). Fill in at least `app_key`, `install_token` and the database details. Leave `payments.provider` empty until the payment account is live: the Give page then uses the dial-code method, which works without an account.

## 3. Upload

**Automatic (recommended).** In GitHub, add the secrets `FTP_SERVER`, `FTP_USERNAME` and `FTP_PASSWORD` (Settings → Secrets and variables → Actions). Every push to `main` then tests, builds and uploads the site.

**By hand.** Run `cd api && composer install --no-dev` and then `npm ci && npm run build`. Upload the contents of `dist/` into `public_html` (File Manager → Upload, or FTP). Remove the old WordPress files once you have the backup.

## 4. First run

1. Open `https://pottershouseoutreachministriesinternational.com/api/install.php?token=<install_token>`. Every check should show ✅. Create the first admin account.
2. Sign in at `/admin`.
3. **Settings → Update mailbox**: enter the update address and its password, then press *Save and test the mailbox*.
4. **Approved senders**: add everyone allowed to email updates.
5. hPanel → Advanced → **Cron Jobs** → every 5 minutes:
   `/usr/bin/php /home/<user>/domains/pottershouseoutreachministriesinternational.com/public_html/api/cron/inbox.php`
   If the PHP command doesn't work on your plan, use the URL instead:
   `curl -s "https://pottershouseoutreachministriesinternational.com/api/cron/inbox?token=<cron_token>"`
6. Check `https://pottershouseoutreachministriesinternational.com/api/health`. It shows whether the database, payments and Claude are on.

## 5. Payments

When the Yo! Payments (or Flutterwave) account is approved, fill in `payments` in `phomi-config.php` and set `provider`. Give the provider the notification URL:

- Yo! Payments: `https://pottershouseoutreachministriesinternational.com/api/webhook/yo?s=<ipn_secret>`
- Flutterwave: `https://pottershouseoutreachministriesinternational.com/api/webhook/flutterwave`, with the same secret hash as in the config

Test with UGX 500 on MTN and on Airtel, then check **Admin → Giving**.

## 6. Claude

Add `anthropic.api_key` to `phomi-config.php`. Emails without a tag are then read and sorted automatically, and photos get captions. Without a key, tagged emails still work.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `/admin` says the server is not set up | `phomi-config.php` is missing or in the wrong folder, or the database details are wrong. Open `/api/health` |
| Photos upload but look unchanged | The GD extension is off. Turn it on in PHP Configuration |
| "That file is too big for the server" | Raise `upload_max_filesize` and `post_max_size` |
| Emails are not picked up | Check the cron job. In Admin → Emailed updates press *Check mailbox now* to see the error. Check the sender is on the approved list |
| Replies from the website go to spam | Make sure SPF/DKIM are on for the domain (hPanel → Emails → DNS settings) |
