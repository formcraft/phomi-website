# Try the website on your own computer, before hosting

You can run the whole website on your own computer, in English and Luganda, including the admin page, the Bible, the sign-up forms, giving and the verse emails. It needs no hosting, no database server and no internet account.

- The database is a single file (SQLite) instead of MySQL.
- Giving uses a pretend payment provider. A gift is confirmed after a few seconds, and no money moves.
- Emails and SMS are not really sent. You read them at `/__mail` and `/__sms`, and the links in them work (Confirm, Unsubscribe, approve updates).
- Your test data stays in the `.local` folder, which is never uploaded or put in GitHub.

## The quick way: ask Claude Code

Open Claude Code on your computer, in an empty folder, and paste the prompt below.

---

**Prompt for Claude Code**

> Set up the Potter's House church website (github.com/formcraft/phomi-website, branch `admin-backend`) so I can try it on this computer before we buy hosting.
>
> 1. Check that Git, Node.js 20 or newer and PHP 8.1 or newer are installed. Install whatever is missing for my system:
>    - Windows: `winget install Git.Git OpenJS.NodeJS.LTS PHP.PHP.8.3`. Then turn on these extensions in php.ini: `pdo_sqlite`, `sqlite3`, `gd`, `mbstring`, `fileinfo`, `openssl`, `curl`, `zip`. To find php.ini, run `php --ini`. If there is none, copy `php.ini-development` to `php.ini` and set `extension_dir = "ext"`.
>    - Mac: `brew install git node php`.
>    - Linux: `sudo apt install git nodejs npm php-cli php-sqlite3 php-gd php-mbstring php-curl php-xml`.
>
>    Ask me before installing anything.
> 2. Clone the repository, switch to the `admin-backend` branch, and run `npm install`.
> 3. Run `npm run local -- --lan`. Tell me the website address, the admin email and password it prints, and the address to open on my phone (same Wi-Fi). If I had the site running before, run `npm run local -- --lan --fresh` once so the new admin account and Luganda Bible are set up.
> 4. In a second terminal, run the checks and tell me the results in plain words. If any check fails, explain what it means and fix it on a new branch, with a test.
>    - `npm run test:api` (backend)
>    - `npx playwright install chromium`, then `npm run test:site` (desktop and phone)
>    - `npm run test:phone` (every page on four phone sizes, offline, plus the security checks)
> 5. Take me through the site page by page, using the checklist in `docs/LOCAL-PREVIEW.md`, first in English, then again after I press the **Luganda** button in the menu bar. Wait for me at each page, and write down anything I want changed, including Luganda wording.
> 6. Show me Admin → **Site text & language** (change a piece of wording, its font, size and colour, then put it back) and Admin → **Social links**.
>
> Rules: never put passwords, keys or real member emails or phone numbers in the repository. Every new piece of site text needs English and Luganda in `src/text.js`. Don't push to `main`, because merging to `main` deploys the live site. Don't sign up for any paid service. The site must run on plain scripts, with no AI service.

---

## The manual way

1. Install [Git](https://git-scm.com), [Node.js](https://nodejs.org) 20+ and PHP 8.1+ with the extensions listed above.
2. Run these:

```bash
git clone https://github.com/formcraft/phomi-website.git
cd phomi-website
git checkout admin-backend
npm install
npm run local
```

3. Open **http://localhost:8080**. The admin page is **http://localhost:8080/admin**: email `formcraftinc@gmail.com`, password `Potters-preview`. That password only works on your computer; change it in Admin → Account. (If you ran the site before this change, start once with `npm run local -- --fresh`.)
4. To try it on your phone, stop the server (Ctrl+C) and run `npm run local -- --lan`. Open the address it prints on a phone that is on the same Wi-Fi. If the phone can't connect, allow Node/PHP through the computer's firewall when asked.
5. To start again with an empty site, run `npm run local -- --fresh`.

## What to check, page by page

| Page | Try this |
| --- | --- |
| Home `/` | Background video, Verse of the Day card, the sign-up box, the phone menu (☰) |
| Language button | Press **Luganda** in the menu bar (on a phone it is next to ☰). Every page, the menu and the forms change to Luganda. Open another page: it stays in Luganda. Press **English** to go back. A link ending in `?lang=lg` opens the site in Luganda |
| Bible `/bible` | Type `John 3:16`, then `Psalm 23`, then words like `living water`. Change book, chapter and translation. Tap a verse: Share on WhatsApp, Copy, **Send to a number**. Download the Facebook and status pictures. In Luganda, the Bible opens in **Bayibuli Entukuvu**: try `Yokaana 3:16` and `Zabbuli 23`, and see the credit under the chapter |
| Sign-up (Bible page or Home) | Sign up with an email: open `/__mail` and press Confirm. Sign up with only a phone number and tick **Please call me**: check `/__mail` for the alert to the private list address. Sign up again in Luganda: the answer, the email and the SMS are in Luganda |
| Sermons, Events, Gallery | Pictures load, the photo viewer opens and closes, filters work |
| Give `/give` | Type `0772 123456`: MTN is picked. Type `0752 123456`: Airtel is picked. Give UGX 500 and wait for "Thank you" |
| Prayer, Contact | Send a request. It appears in Admin → Prayer & messages |
| Admin → Daily verses | Change tomorrow's verse; download today's pictures |
| Admin → Verse emails & SMS | Preview a letter, pause and resume, send a test |
| Admin → Email list / Phone list | See the sign-ups, download the lists, press **Email both lists now** and check `/__mail` |
| Admin → Settings → Lists and sign-ups | Put in the private email that should receive the lists |
| Admin → Site text & language | Search for any words, type new English or Luganda wording, pick a font, size or colour, press Save and look at the page. Then press **Use the built-in wording**. Try the whole-site fonts, colours and text size, and the first language for new visitors |
| Admin → Social links | Enter the Facebook, YouTube, TikTok, Instagram and WhatsApp links. The icons in the footer open each page in a new tab |
| Admin → History & undo | Delete something, then undo it |

## The automatic checks

| Command | What it checks |
| --- | --- |
| `npm run test:api` | The backend: Bible, sign-ups, private list emails, verse emails, SMS, giving, emailed updates, undo, sign-in |
| `npm run test:site` | The built site in a real browser on desktop and phone, every main flow, the language button, the Luganda Bible and sign-up, Site text and Social links. It also checks every piece of text has Luganda |
| `npm run test:phone` | Every page and every admin section on a 320px Android, a 360px Android, an iPhone 13 and a tablet. It checks every page in English and again in Luganda. It checks the language button is on screen, links to other websites open in a new tab, pages fit the screen, form text is big enough that iPhones don't zoom in, buttons are big enough to tap, every picture has a description, page weight, and that nothing loads from other websites. It also checks the security basics listed below |

The browser tests run with every other website blocked, so they work with no internet. GitHub runs all three on every change too.

## Security in place

There are no visitor passwords. Visitors only give an email or a phone number. These protections are in place:

- **Lists stay private.** The email and phone lists are only visible to signed-in admins. Their copies go to a private address you choose (Settings → Lists and sign-ups), not the website mailbox. Spreadsheet exports are protected against formula tricks.
- **Email sign-ups are double opt-in.** Nobody is added until they press Confirm in their own inbox. Links in emails only act when a button is pressed, so email scanners can't confirm or unsubscribe anyone. Every email has a one-click unsubscribe.
- **Spam and flooding.** The forms have a hidden bot trap and limits per address and per hour, so the site can't be used to flood someone's inbox or phone.
- **Admin sign-in.** Passwords of 10 or more characters are stored hashed. Repeated guessing is slowed down. The admin cookie is HTTPS-only and same-site, and sign-in ends after 12 hours of no use. Admin requests from other websites are refused.
- **Browser protections.** A strict Content Security Policy only allows this site's own scripts, plus videos from YouTube, TikTok and Facebook. Other sites can't frame the pages. On Hostinger, HTTPS is forced and remembered, and camera, microphone and location are switched off.
- **Server files.** The code, settings, data and tests can't be downloaded. Hidden files (.git, .env) are never served. Uploaded files can't run as programs. Secrets live in `phomi-config.php` outside the website folder.
- **Links to other websites** (Facebook, YouTube, WhatsApp, maps) open in a new tab, so the church site stays open, and the other site can't control the church's tab (`noopener`).
- **Site text is plain text.** Wording typed in Admin → Site text is shown as text, never run as code. Fonts must come from the list, sizes from 10 to 96, and colours must be real colour codes.
- **No third parties.** Fonts are served by the site itself (no Google Fonts), so visitors aren't tracked. Only the videos you add come from YouTube, TikTok or Facebook.

## Next: going live

When you're happy with the site, follow [GO-LIVE-WITH-CLAUDE-CODE.md](GO-LIVE-WITH-CLAUDE-CODE.md). Claude Code takes you through each step: the WordPress backup, Hostinger, putting the site live, email, and getting found on Google.
