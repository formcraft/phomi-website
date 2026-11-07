# What we need to go live

This is everything the church (or the person setting up the site) needs to provide or set up. Tick each item as it is done. Where it says **you do this**, the step needs someone who can sign in to that account. Never paste passwords or keys into GitHub, chat or email. They go only into the server config file or into GitHub's encrypted secrets, as explained below.

The website stays at **https://pottershouseoutreachministriesinternational.com**.

---

## 1. Hostinger hosting (needed first)

| # | What | Where to find or do it | Why |
|---|------|------------------------|-----|
| 1.1 | Access to hPanel for the account that hosts the domain, or a team-member invite for the developer | hpanel.hostinger.com → Account → Team members | To set up the database, mailbox, cron job and files |
| 1.2 | **Back up the current WordPress site** before anything is replaced | hPanel → Websites → Manage → Files → Backups (download files and database) | The new site replaces the WordPress site in `public_html`. The backup lets you restore it if needed |
| 1.3 | Hosting plan name (Premium, Business or Cloud) | hPanel → Hosting | All plans run PHP and MySQL. Business/Cloud add SSH, which makes setup easier but is not required |
| 1.4 | Set PHP version to **8.2 or 8.3** | hPanel → Advanced → PHP Configuration | The backend needs PHP 8.1 or newer |
| 1.5 | In PHP Configuration → PHP options: `upload_max_filesize` and `post_max_size` = **128M**, `max_execution_time` = **120** | same page | So sermon audio and videos can be uploaded from the admin page |
| 1.6 | Check these PHP extensions are ticked: **curl, gd, mbstring, fileinfo, openssl, pdo_mysql** (and **exif** if listed) | same page → PHP extensions | Photos, payments, mailbox and database |
| 1.7 | Create a MySQL database: write down the **database name, user and password** | hPanel → Databases → MySQL Databases | Stores sermons, photos, gifts, messages |
| 1.8 | Create an FTP account (or use the main one): write down **FTP host, username, password** | hPanel → Files → FTP Accounts | GitHub uploads each new version of the site automatically |
| 1.9 | SSL certificate active on the domain | hPanel → Security → SSL | The site forces https |

## 2. Server config file (you do this, about 10 minutes)

1. Open hPanel → Files → File Manager. Go **one folder above** `public_html` (the folder named after the domain).
2. Create a file called `phomi-config.php` there. Copy the contents of [`api/config.sample.php`](../api/config.sample.php) into it.
3. Fill in: the database name, user and password from 1.7; three long random strings for `app_key`, `install_token` and `cron_token` (use a password generator, 40+ characters each); the payment keys when you have them (section 4).
4. After the first deploy, open `https://pottershouseoutreachministriesinternational.com/api/install.php?token=<your install_token>` and create the first admin account. That page also checks the server has everything it needs.

## 3. Church email for automatic updates

| # | What | Notes |
|---|------|-------|
| 3.1 | Create a mailbox, for example **updates@pottershouseoutreachministriesinternational.com**, and keep its password | hPanel → Emails → Email Accounts. Any name works |
| 3.2 | Enter the address and password in **Admin → Settings → Update mailbox**, then press **Save and test the mailbox** | The password is stored encrypted |
| 3.3 | The **list of approved senders**: name and email address of each person allowed to post (pastor, media team, church secretary) | Admin → Approved senders. Mail from anyone else is ignored |
| 3.4 | Who will **approve** emailed updates? Every update waits for an admin to approve it before it shows | Each approver needs an admin account (Admin → Account) |
| 3.5 | Who receives **alerts** (approval requests, prayer requests, website messages, gifts)? One or more email addresses | Admin → Settings → Send alerts to |
| 3.6 | Cron job: every 5 minutes, command `/usr/bin/php /home/<user>/domains/pottershouseoutreachministriesinternational.com/public_html/api/cron/inbox.php` | hPanel → Advanced → Cron Jobs. The exact path is shown in File Manager |
| 3.7 | Decision: a **WhatsApp Business number** for updates later? It needs a spare SIM that is not already on WhatsApp and a Meta Business account | Optional, after email works |

## 4. Mobile Money payments (PIN prompt on the giver's phone)

The site is built to work with **Yo! Payments** (Ugandan, sends the MTN/Airtel PIN prompt directly) and **Flutterwave** (opens a short confirmation page first, then the prompt). We recommend **Yo! Payments** because the giver only types their number and enters their PIN.

| # | What | Notes |
|---|------|-------|
| 4.1 | Decide the provider: **Yo! Payments** (recommended) or **Flutterwave** | |
| 4.2 | Open a business account with the provider in the church's registered name | yo.co.ug (Business account, "Collections" / deposit funds API) or flutterwave.com |
| 4.3 | Documents they will ask for (KYC). Typically: **certificate of registration or incorporation** (company limited by guarantee, NGO Bureau permit, or trustees' incorporation), **TIN certificate** from URA, **bank account** in the church's name for payouts, **national IDs of two or three signatories or directors**, a board or trustees' **resolution** authorising the account, proof of address | Confirm the exact list with the provider: it changes |
| 4.4 | When approved, get the **API credentials**: Yo! API username + API password (and a sandbox account for testing); or Flutterwave **secret key** and a **webhook secret hash** | Put them only in `phomi-config.php`, never in GitHub |
| 4.5 | Yo!: ask them to enable **deposit funds (collections)** for MTN and Airtel, and give them the notification URL `https://pottershouseoutreachministriesinternational.com/api/webhook/yo?s=<ipn_secret>` | Flutterwave: Settings → Webhooks → URL `https://pottershouseoutreachministriesinternational.com/api/webhook/flutterwave` and the same secret hash as in the config |
| 4.6 | The **name givers will see** on the PIN prompt (e.g. "POTTERS HOUSE OUTREACH") | Shown on the Give page so givers know it is genuine. Admin → Settings → Giving details |
| 4.7 | **Test** one small gift on MTN and one on Airtel (UGX 500–1,000), then check it in Admin → Giving and in the provider dashboard | |
| 4.8 | Fallback numbers: the church's own **MTN MoMo and Airtel Money numbers** and registered names, used for the "dial a code" option | Admin → Settings → Giving details |
| 4.9 | **Bank transfer details**: bank, branch, account name, account number; **SWIFT code** for gifts from abroad | Admin → Settings → Giving details |
| 4.10 | Decide the **minimum and maximum** gift by phone (now UGX 500 to 5,000,000) | Change in `phomi-config.php` → payments → min / max |

## 5. Videos (YouTube and TikTok)

| # | What | Notes |
|---|------|-------|
| 5.1 | The church's **YouTube channel** link (create one with the church Google account if there is none) | Admin → Settings → Video and social pages |
| 5.2 | The church's **TikTok** account link | Same place |
| 5.3 | Who uploads videos to YouTube/TikTok, and are they on the approved senders list so they can email the links with "Video:"? | Admin → Approved senders |

No AI service or API key is needed anywhere. The site runs on plain scripts.

## 6. GitHub (automatic deploys)

| # | What | Notes |
|---|------|-------|
| 6.1 | Add repository secrets **FTP_SERVER**, **FTP_USERNAME**, **FTP_PASSWORD** from step 1.8 | github.com/formcraft/phomi-website → Settings → Secrets and variables → Actions |
| 6.2 | Merge the pull request into `main`. Every push to `main` then tests, builds and uploads the site | Free: GitHub Actions costs nothing for a public repository. No paid GitHub plan or CLI needed. Or skip this and upload `dist/` by hand |

## 7. Church content still to confirm

| # | What | Where it goes |
|---|------|---------------|
| 7.1 | **Pastor and leaders**: names, roles, one photo each, two or three sentences about each | About page, leadership section |
| 7.2 | **Prayer day** (the time 6:30pm – 8:30pm is known) | Admin → Settings → Weekly times |
| 7.3 | **Bible study day and time**, and who it is for | Admin → Settings → Weekly times; Ministries page |
| 7.4 | The correct **WhatsApp number**. The old site shows two different numbers: +256 775 672 762 and +256 775 672 562 | Admin → Settings → Contact details |
| 7.5 | Confirm the **village spelling**: Burweta (used now) or Bureta | Site text |
| 7.6 | **Directions**: distance from Mbale town and a landmark, and a Google Maps pin of the church | Contact page |
| 7.7 | **Instagram** link, if any | Admin → Settings → Video and social pages |
| 7.8 | The first few **sermons**: title, preacher, date, scripture, and audio/video or a YouTube, TikTok or Facebook link | Email them with "Sermon:" or add them in Admin → Sermons |
| 7.9 | Upcoming **events** with dates | Email with "Event:" or Admin → Events |
| 7.10 | **Testimonies**, with each person's permission to publish | Admin → Testimonies |
| 7.11 | **Registration details** for the footer (e.g. "Registered NGO no. …") if the church wants them shown | Footer |
| 7.12 | A short **privacy note**: who reads prayer requests and how long they are kept | Prayer page |
