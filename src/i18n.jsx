import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { TEXT } from './text.js';
import { useLive } from './live.jsx';

// English and Luganda. The visitor's choice is remembered on their phone; ?lang=lg or ?lang=en in a link sets it too.
// The church's own wording and styles from Admin → Site text (live.text) win over the built-in text in text.js.

const KEY = 'phomi-lang';
const Lang = createContext({ lang: 'en', setLang: () => {} });

const firstChoice = () => {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'lg' || q === 'en') { localStorage.setItem(KEY, q); return q; }
    const s = localStorage.getItem(KEY);
    return s === 'lg' || s === 'en' ? s : null;
  } catch {
    return null;
  }
};

const FONT = { head: 'var(--head)', body: 'var(--body)', seal: 'var(--seal)' };
export const fontCss = (f) => FONT[f] || (f ? `'${f}', sans-serif` : undefined);

export function styleOf(s) {
  if (!s || typeof s !== 'object') return null;
  const out = {};
  if (s.font) out.fontFamily = fontCss(s.font);
  if (s.size) out.fontSize = `${s.size}px`;
  if (s.color) out.color = s.color;
  if (s.weight) out.fontWeight = s.weight;
  if (s.italic) out.fontStyle = 'italic';
  return Object.keys(out).length ? out : null;
}

// The whole-site fonts, colours and size chosen in Admin → Site text
function applyTheme(raw) {
  let t = {};
  try { t = typeof raw === 'string' && raw ? JSON.parse(raw) : raw || {}; } catch { t = {}; }
  const root = document.documentElement.style;
  const set = (v, val) => (val ? root.setProperty(v, val) : root.removeProperty(v));
  set('--head', t.head && fontCss(t.head));
  set('--body', t.body && fontCss(t.body));
  set('--dark', t.text);
  set('--clay', t.clay);
  set('--accent', t.gold);
  set('--dark2', t.navy);
  set('--heading', t.heading);
  document.body.style.zoom = t.scale ? String(t.scale / 100) : '';
}

export function LangProvider({ children }) {
  const { settings = {} } = useLive();
  const [chosen, setChosen] = useState(firstChoice);
  const lang = chosen || (settings.default_lang === 'lg' ? 'lg' : 'en');
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { applyTheme(settings.site_theme); }, [settings.site_theme]);
  const value = useMemo(() => ({
    lang,
    setLang: (l) => { setChosen(l); try { localStorage.setItem(KEY, l); } catch { /* private mode */ } },
  }), [lang]);
  return <Lang.Provider value={value}>{children}</Lang.Provider>;
}

export const useLang = () => useContext(Lang);

const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : s);

// t('key', {vars}) → the text in the visitor's language
export function useT() {
  const { lang } = useLang();
  const { text } = useLive();
  return useMemo(() => {
    const over = text || {};
    const t = (k, vars) => {
      const o = over[k];
      const base = TEXT[k];
      const s = (o && o[lang]) || (base ? base[lang === 'lg' ? 1 : 0] || base[0] : k);
      return fill(String(s), vars);
    };
    t.lang = lang;
    t.style = (k) => styleOf(over[k]?.style);
    // Days typed in English by the church ("Every Sunday", "Wednesday") read in Luganda
    t.days = (s) => {
      if (!s || lang !== 'lg') return s;
      return String(s).replace(/\b(Every|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/g, (d) => t(`days.${d}`));
    };
    return t;
  }, [lang, text]);
}

// <T k="home.heroTitle" /> → the text, wrapped in a styled span only when the church set a font, size or colour for it
export function T({ k, vars }) {
  const t = useT();
  const st = t.style(k);
  const s = t(k, vars);
  return st ? <span style={st} data-k={k}>{s}</span> : s;
}

// The English / Luganda switch, on every page next to the menu button
export function LangToggle({ className = 'langbtn' }) {
  const { lang, setLang } = useLang();
  const t = useT();
  const next = lang === 'lg' ? 'en' : 'lg';
  return (
    <button type="button" className={className} onClick={() => setLang(next)} lang={next} aria-label={t('header.langHint')} title={t('header.langHint')}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>
      <span>{t('header.langSwitch')}</span>
    </button>
  );
}
