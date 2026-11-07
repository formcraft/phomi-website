import { createContext, useContext, useEffect, useState } from 'react';
import { BANK, CHURCH, MOMO, TIMES } from './data.js';

// Live content from the admin page and the update mailbox (/api/content).
// The built-in content in data.js shows first and stays as a backup if the server can't be reached.

const KEY = 'phomi-live-v1';
const EMPTY = { sermons: [], videos: [], photos: [], events: [], announcements: [], testimonies: [], settings: {}, payments: 'ussd', ready: false };
const Live = createContext(EMPTY);

function applySettings(s = {}) {
  const set = (obj, key, v) => { if (v) obj[key] = v; };
  set(TIMES, 'sunday', s.times_sunday);
  set(TIMES, 'prayerDay', s.times_prayer_day);
  set(TIMES, 'prayerTime', s.times_prayer_time);
  set(TIMES, 'bibleStudyDay', s.times_bible_day);
  set(TIMES, 'bibleStudyTime', s.times_bible_time);
  if (s.whatsapp) {
    CHURCH.whatsapp = s.whatsapp;
    CHURCH.whatsappDigits = s.whatsapp.replace(/\D/g, '').replace(/^0/, '256');
  }
  if (s.phones) CHURCH.phones = s.phones.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
  set(CHURCH, 'email', s.email);
  set(CHURCH, 'facebook', s.facebook);
  set(CHURCH, 'youtube', s.youtube);
  set(CHURCH, 'tiktok', s.tiktok);
  set(CHURCH, 'instagram', s.instagram);
  set(MOMO.mtn, 'num', s.momo_mtn_number);
  set(MOMO.mtn, 'reg', s.momo_mtn_name);
  set(MOMO.airtel, 'num', s.momo_airtel_number);
  set(MOMO.airtel, 'reg', s.momo_airtel_name);
  set(BANK, 'bank', s.bank_name);
  set(BANK, 'accountNumber', s.bank_account);
  set(BANK, 'swift', s.bank_swift);
}

function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (c && typeof c === 'object') {
      applySettings(c.settings);
      return { ...EMPTY, ...c, ready: false };
    }
  } catch {
    /* private mode or bad cache: start from the built-in content */
  }
  return EMPTY;
}

export function LiveProvider({ children }) {
  const [data, setData] = useState(readCache);
  useEffect(() => {
    let gone = false;
    fetch('/api/content', { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : Promise.reject()))
      .then((d) => {
        if (gone) return;
        applySettings(d.settings);
        setData({ ...EMPTY, ...d, ready: true });
        try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ }
      })
      .catch(() => { if (!gone) setData((x) => ({ ...x, ready: true })); });
    return () => { gone = true; };
  }, []);
  return <Live.Provider value={data}>{children}</Live.Provider>;
}

// Call in any component that shows times, numbers or live lists, so it updates when fresh content arrives.
export const useLive = () => useContext(Live);

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseDate(s) {
  if (!s) return null;
  const [d, t = '00:00:00'] = String(s).split(' ');
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);
  return new Date(y, m - 1, day, hh, mm);
}

export function niceDate(s) {
  const d = parseDate(s);
  return d ? `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}` : '';
}

export function niceTime(s) {
  const d = parseDate(s);
  if (!d || (d.getHours() === 0 && d.getMinutes() === 0)) return '';
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')}${d.getHours() < 12 ? 'am' : 'pm'}`;
}

// Live event → the shape the Events page cards use
export function eventCard(e) {
  const d = parseDate(e.starts_at);
  return {
    key: 'live-' + e.id,
    day: d ? String(d.getDate()) : '',
    mon: d ? MON[d.getMonth()] : '',
    kind: e.kind || 'Event',
    name: e.title,
    time: niceTime(e.starts_at) || 'All day',
    venue: e.venue || 'PHOMI, Burweta',
    photo: e.cover || null,
    details: e.details || ''
  };
}

// YouTube link → embeddable URL, or null
// Turns a YouTube, TikTok or Facebook link into something the page can play in place.
// shape: 'wide' (16:9) or 'tall' (9:16, for Shorts, TikTok and Reels). Returns null for other links.
export function videoEmbed(url) {
  const u = String(url || '').trim();
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (m) {
    return { site: 'YouTube', shape: /\/shorts\//.test(u) ? 'tall' : 'wide', src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0`, thumb: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` };
  }
  m = u.match(/tiktok\.com\/(?:@[\w.-]+\/video|embed(?:\/v2)?|player\/v1)\/(\d{6,})/);
  if (m) return { site: 'TikTok', shape: 'tall', src: `https://www.tiktok.com/player/v1/${m[1]}?rel=0&description=0`, thumb: '' };
  if (/^https:\/\/(www\.|m\.)?(facebook\.com|fb\.watch)\//.test(u) && /\/(videos?|watch|reel|share\/[rv])\b|fb\.watch/.test(u)) {
    const tall = /\/(reel|share\/r)\b/.test(u);
    return { site: 'Facebook', shape: tall ? 'tall' : 'wide', src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u)}&show_text=false`, thumb: '' };
  }
  return null;
}

// Name of the site a link points to, for "Watch on …" buttons.
export function linkSite(url) {
  const u = String(url || '');
  if (/tiktok\.com/.test(u)) return 'TikTok';
  if (/youtu\.?be/.test(u)) return 'YouTube';
  if (/facebook\.com|fb\.watch/.test(u)) return 'Facebook';
  return 'the web';
}

export function youtubeEmbed(url) {
  const e = videoEmbed(url);
  return e && e.site === 'YouTube' ? e.src : null;
}
