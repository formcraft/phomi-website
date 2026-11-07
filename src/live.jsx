import { createContext, useContext, useEffect, useState } from 'react';
import { BANK, CHURCH, MOMO, TIMES } from './data.js';

// Live content from the admin page and the update mailbox (/api/content).
// The built-in content in data.js shows first and stays as a backup if the server can't be reached.

const KEY = 'phomi-live-v1';
const EMPTY = { sermons: [], photos: [], events: [], announcements: [], testimonies: [], settings: {}, payments: 'ussd', ready: false };
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
export function youtubeEmbed(url) {
  const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}
