# Potter's House Outreach Ministries International — website

The website for PHOMI (Church & Bible Study), Burweta, Butebo District, Uganda.
Built with **React + JavaScript** using [Vite](https://vite.dev), hosted on **Hostinger**.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev       # opens the site at http://localhost:5173 and reloads as you edit
npm run build     # makes the finished site in the dist/ folder
npm run preview   # serves dist/ so you can check the build
```

## Where to change things

| What | Where |
| --- | --- |
| Phone numbers, WhatsApp, email, Facebook, address | `src/data.js` → `CHURCH` |
| Prayer Time day, Bible study day and time | `src/data.js` → `TIMES` |
| Mobile Money numbers and registered names | `src/data.js` → `MOMO` |
| Bank details | `src/data.js` → `BANK` |
| Gift amount buttons | `src/data.js` → `AMOUNTS` |
| Upcoming events | `src/data.js` → `EVENTS` |
| Photos (gallery and captions) | `public/img/` + `src/data.js` → `PHOTOS` |
| Videos | `public/video/` + `src/data.js` → `CLIPS` |
| Page text | `src/pages/*.jsx` |
| Colours, fonts, layout | `src/styles.css` |
| Logo (Refined Seal) | `src/components/Seal.jsx`, pot artwork in `public/img/pot.png` |

Text the church still needs to supply shows on the site with a gold highlight
(the `<Tbc>` component). Search for `Tbc` to find every one.

## Giving

The Give page lets people type any amount or pick 1,000 – 50,000 UGX. On a phone,
**Give now** opens the MTN MoMo (`*165#`) or Airtel Money (`*185#`) menu in the dialer.
Once `MOMO.mtn.num` / `MOMO.airtel.num` are filled in, the church number and amount are
pre-filled so the giver only enters their PIN. Test one small gift on each network after
setting the numbers, since networks change their menu paths from time to time.

For a payment prompt that pops up on the giver's phone automatically (no dialing), connect
a payment provider such as Flutterwave or the MTN MoMo Collections API. That needs a small
server-side script (Hostinger supports PHP or Node.js) to keep the API keys secret.

## Deploy to Hostinger

**Option A — automatic (recommended).** Every push to `main` builds the site with GitHub
Actions and uploads `dist/` to `public_html`. One-time setup:

1. In Hostinger hPanel go to **Files → FTP Accounts** and note the FTP host, username and password.
2. In this GitHub repo go to **Settings → Secrets and variables → Actions** and add
   `FTP_SERVER`, `FTP_USERNAME` and `FTP_PASSWORD`.
3. Push to `main` (or run the workflow from the **Actions** tab).

**Option B — by hand.** Run `npm run build`, then in hPanel open **File Manager →
public_html**, upload everything inside `dist/` (including the hidden `.htaccess`), and
extract if you uploaded a zip.

`public/.htaccess` is copied into the build. It turns on HTTPS, makes page links such as
`/about` and `/give` work when opened directly, and sets sensible caching.
