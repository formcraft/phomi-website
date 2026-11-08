import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { GROUPS, TEXT } from '../text.js';
import { fontCss } from '../i18n.jsx';

// Admin → Site text: every piece of wording on the public site, in English and Luganda,
// with its own font, size, colour, bold and italic. Plus the whole-site fonts, colours and text size.

const FONT_NAME = { head: 'Heading font (Playfair Display)', body: 'Body font (Poppins)', seal: 'Name font (Cinzel)' };
const fontLabel = (f) => FONT_NAME[f] || f;
const COLOURS = [['text', 'Main text', '#3A2418'], ['heading', 'Headings', '#3A2418'], ['clay', 'Clay (buttons, links)', '#9A4A26'], ['gold', 'Gold (highlights)', '#C9962E'], ['navy', 'Dark bands', '#1F2A44']];
const Note = ({ kind = 'info', children }) => <div className={'adm-note ' + kind} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>;

function Theme({ theme, fonts, onSaved }) {
  const [t, setT] = useState(theme || {});
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setT((x) => { const n = { ...x }; if (v === '' || v == null) delete n[k]; else n[k] = v; return n; });
  const save = async () => {
    setBusy(true);
    setInfo(null);
    try {
      await api('/admin/settings', { method: 'POST', body: { site_theme: JSON.stringify(t) } });
      setInfo({ kind: 'ok', text: 'Saved. Visitors see the new look within a minute.' });
      onSaved?.();
    } catch (x) {
      setInfo({ kind: 'error', text: x.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="adm-card">
      <h2>Whole-site look</h2>
      <p className="adm-muted">These change every page at once. Leave a box empty to keep the built-in look.</p>
      {info && <Note kind={info.kind}>{info.text}</Note>}
      <div className="adm-grid">
        <label className="adm-field">Heading font
          <select value={t.head || ''} onChange={(e) => set('head', e.target.value)}>
            <option value="">Built-in (Playfair Display)</option>
            {fonts.filter((f) => f !== 'head').map((f) => <option key={f} value={f}>{fontLabel(f)}</option>)}
          </select>
        </label>
        <label className="adm-field">Body text font
          <select value={t.body || ''} onChange={(e) => set('body', e.target.value)}>
            <option value="">Built-in (Poppins)</option>
            {fonts.filter((f) => f !== 'body').map((f) => <option key={f} value={f}>{fontLabel(f)}</option>)}
          </select>
        </label>
        <label className="adm-field">Text size: {t.scale || 100}%
          <input type="range" min="85" max="130" step="5" value={t.scale || 100} onChange={(e) => set('scale', Number(e.target.value) === 100 ? '' : Number(e.target.value))} />
        </label>
      </div>
      <div className="adm-grid">
        {COLOURS.map(([k, label, def]) => (
          <div key={k} className="adm-field">{label}
            <span className="st-colour">
              <input type="color" aria-label={label} value={t[k] || def} onChange={(e) => set(k, e.target.value)} />
              {t[k] ? <button type="button" className="adm-btn small ghost" onClick={() => set(k, '')}>Built-in</button> : <span className="adm-muted">Built-in</span>}
            </span>
          </div>
        ))}
      </div>
      <div><button type="button" className="adm-btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save the look'}</button></div>
    </section>
  );
}

function TextRow({ k, saved, fonts, onSaved }) {
  const [en, lg0] = TEXT[k];
  const [v, setV] = useState({ en: saved?.en || '', lg: saved?.lg || '', style: saved?.style || {} });
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(null);
  const st = v.style;
  const setSt = (key, val) => setV((x) => { const s = { ...x.style }; if (val === '' || val == null || val === false) delete s[key]; else s[key] = val; return { ...x, style: s }; });
  const changed = (saved?.en || '') !== v.en || (saved?.lg || '') !== v.lg || JSON.stringify(saved?.style || {}) !== JSON.stringify(st);
  const save = async () => {
    setBusy(true);
    setInfo(null);
    try {
      const r = await api('/admin/text', { method: 'POST', body: { k, en: v.en, lg: v.lg, style: st } });
      onSaved(k, r.text);
      setInfo({ kind: 'ok', text: 'Saved.' });
    } catch (x) {
      setInfo({ kind: 'error', text: x.message });
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    setBusy(true);
    try {
      await api('/admin/text/reset', { method: 'POST', body: { k } });
      setV({ en: '', lg: '', style: {} });
      onSaved(k, {});
      setInfo({ kind: 'ok', text: 'Back to the built-in wording.' });
    } catch (x) {
      setInfo({ kind: 'error', text: x.message });
    } finally {
      setBusy(false);
    }
  };
  const preview = {
    fontFamily: st.font ? fontCss(st.font) : undefined,
    fontSize: st.size ? `${st.size}px` : undefined,
    color: st.color,
    fontWeight: st.weight,
    fontStyle: st.italic ? 'italic' : undefined,
  };
  const rows = Math.min(6, Math.max(2, Math.ceil(Math.max(en.length, (lg0 || '').length) / 70)));
  return (
    <div className="st-row" id={`st-${k}`}>
      <div className="st-key"><code>{k}</code>{saved && Object.keys(saved).length > 0 && <span className="adm-badge">Changed</span>}</div>
      <div className="adm-grid">
        <label className="adm-field">English
          <textarea rows={rows} value={v.en} placeholder={en} onChange={(e) => setV({ ...v, en: e.target.value })} />
        </label>
        <label className="adm-field">Luganda
          <textarea rows={rows} lang="lg" value={v.lg} placeholder={lg0 || en} onChange={(e) => setV({ ...v, lg: e.target.value })} />
        </label>
      </div>
      <div className="st-tools">
        <label className="adm-field">Font
          <select value={st.font || ''} onChange={(e) => setSt('font', e.target.value)}>
            <option value="">As the page</option>
            {fonts.map((f) => <option key={f} value={f}>{fontLabel(f)}</option>)}
          </select>
        </label>
        <label className="adm-field">Size (px)
          <input type="number" min="10" max="96" inputMode="numeric" value={st.size || ''} placeholder="As the page" onChange={(e) => setSt('size', e.target.value ? Number(e.target.value) : '')} />
        </label>
        <div className="adm-field">Colour
          <span className="st-colour">
            <input type="color" aria-label={`Colour for ${k}`} value={st.color || '#3A2418'} onChange={(e) => setSt('color', e.target.value)} />
            {st.color && <button type="button" className="adm-btn small ghost" onClick={() => setSt('color', '')}>Clear</button>}
          </span>
        </div>
        <label className="st-chk"><input type="checkbox" checked={st.weight === 700} onChange={(e) => setSt('weight', e.target.checked ? 700 : '')} /> Bold</label>
        <label className="st-chk"><input type="checkbox" checked={!!st.italic} onChange={(e) => setSt('italic', e.target.checked)} /> Italic</label>
      </div>
      {Object.keys(st).length > 0 && <p className="st-preview" style={preview}>{v.en || en}</p>}
      {k.includes('{') || /\{\w+\}/.test(en) ? <p className="adm-muted">Keep the words in {'{curly brackets}'}: the page fills them in.</p> : null}
      {info && <Note kind={info.kind}>{info.text}</Note>}
      <div className="adm-actions">
        <button type="button" className="adm-btn primary small" onClick={save} disabled={busy || !changed}>{busy ? 'Saving…' : 'Save'}</button>
        {saved && Object.keys(saved).length > 0 && <button type="button" className="adm-btn small ghost" onClick={reset} disabled={busy}>Use the built-in wording</button>}
      </div>
    </div>
  );
}

export default function SiteText() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('home');
  const [lang, setLang] = useState(null);
  const [langInfo, setLangInfo] = useState('');
  const load = () => Promise.all([api('/admin/text'), api('/admin/settings')])
    .then(([r, s]) => { setData(r); setLang(s.settings.default_lang || 'en'); })
    .catch((x) => setErr(x.message));
  useEffect(() => { load(); }, []);

  const keys = useMemo(() => Object.keys(TEXT), []);
  const term = q.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!data) return [];
    if (term) {
      return keys.filter((k) => {
        const o = data.text[k] || {};
        return `${k} ${TEXT[k][0]} ${TEXT[k][1] || ''} ${o.en || ''} ${o.lg || ''}`.toLowerCase().includes(term);
      }).slice(0, 60);
    }
    return keys.filter((k) => k.split('.')[0] === group);
  }, [data, term, group, keys]);

  if (err) return <Note kind="error">{err}</Note>;
  if (!data) return <p>Loading…</p>;
  const counts = keys.reduce((a, k) => { const g = k.split('.')[0]; a[g] = (a[g] || 0) + 1; return a; }, {});
  const onSaved = (k, v) => setData((d) => ({ ...d, text: { ...d.text, [k]: v } }));
  const saveLang = async (v) => {
    setLang(v);
    try {
      await api('/admin/settings', { method: 'POST', body: { default_lang: v } });
      setLangInfo('Saved.');
    } catch (x) {
      setLangInfo(x.message);
    }
  };
  const changedCount = Object.values(data.text).filter((o) => o && Object.keys(o).length).length;

  return (
    <div className="adm-stack">
      <div className="adm-head"><h1>Site text</h1></div>
      <p className="adm-muted">
        Every word on the public website, in English and Luganda. Type new wording and press Save. An empty box keeps the built-in wording shown in grey.
        Changes show on the website within a minute, and History &amp; undo can bring back an earlier version. {changedCount > 0 && <b>{changedCount} changed so far.</b>}
      </p>

      <section className="adm-card">
        <h2>Language</h2>
        <p className="adm-muted">Visitors switch language with the English / Luganda button in the menu bar, and their phone remembers it. This is the language a first-time visitor sees.</p>
        <div className="adm-grid">
          <label className="adm-field">First language for new visitors
            <select value={lang} onChange={(e) => saveLang(e.target.value)}>
              <option value="en">English</option>
              <option value="lg">Luganda</option>
            </select>
          </label>
        </div>
        {langInfo && <Note kind="ok">{langInfo}</Note>}
        <p className="adm-muted">To share a link that opens in Luganda, add <code>?lang=lg</code> to the end, for example <code>/bible?lang=lg</code>.</p>
      </section>

      <Theme theme={data.theme} fonts={data.fonts} />

      <section className="adm-card">
        <h2>Wording</h2>
        <div className="adm-grid">
          <label className="adm-field">Search all text
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type any word, in English or Luganda" />
          </label>
          <label className="adm-field">Part of the site
            <select value={group} onChange={(e) => { setGroup(e.target.value); setQ(''); }}>
              {Object.entries(GROUPS).filter(([g]) => counts[g]).map(([g, label]) => <option key={g} value={g}>{label} ({counts[g]})</option>)}
            </select>
          </label>
        </div>
        {term && <p className="adm-muted">{shown.length ? `${shown.length}${shown.length === 60 ? '+' : ''} found` : 'Nothing found.'}</p>}
        <div className="st-list">
          {shown.map((k) => <TextRow key={k} k={k} saved={data.text[k]} fonts={data.fonts} onSaved={onSaved} />)}
        </div>
      </section>
    </div>
  );
}
