import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Seal from '../components/Seal.jsx';
import { api } from '../api.js';
import { fmt } from '../data.js';
import './admin.css';

// Church admin page: content, the update mailbox, giving, messages and settings.

const SECTIONS = [
  ['dashboard', 'Overview', 'church'],
  ['inbox', 'Emailed updates', 'inbox'],
  ['sermons', 'Sermons', 'book'],
  ['videos', 'Videos', 'play'],
  ['photos', 'Gallery', 'image'],
  ['events', 'Events', 'clock'],
  ['announcements', 'Announcements', 'bell'],
  ['testimonies', 'Testimonies', 'heart'],
  ['gifts', 'Giving', 'gift'],
  ['messages', 'Prayer & messages', 'chat'],
  ['senders', 'Approved senders', 'users'],
  ['history', 'History & undo', 'refresh'],
  ['settings', 'Settings', 'cog'],
  ['account', 'Account', 'out']
];

function useHash() {
  const get = () => (window.location.hash.slice(1) || 'dashboard').split('?')[0];
  const [h, setH] = useState(get);
  useEffect(() => {
    const on = () => setH(get());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return h;
}

const when = (s) => (s ? new Date(s.replace(' ', 'T')).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const linkName = (it) => (it.video ? 'Video file' : /tiktok/.test(it.link) ? 'TikTok' : /youtu/.test(it.link) ? 'YouTube' : /facebook|fb\.watch/.test(it.link) ? 'Facebook' : 'Link');
const day = (s) => (s ? new Date(s.slice(0, 10) + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function Note({ kind = 'info', children }) {
  return <div className={`adm-note ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>;
}

function Badge({ s }) {
  return <span className={`adm-badge ${s}`}>{{ live: 'Live', review: 'Waiting', hidden: 'Hidden', published: 'Published', rejected: 'Rejected', ignored: 'Ignored', error: 'Error', successful: 'Received', pending: 'Pending', failed: 'Failed' }[s] || s}</span>;
}

// ---------- Sign in ----------

function Login({ onIn }) {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setErr('');
    try {
      const r = await api('/admin/login', { method: 'POST', body: f });
      onIn(r.admin);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="adm-login">
      <form onSubmit={submit} className="adm-card">
        <Seal size={84} />
        <h1>Church admin</h1>
        <p>Sign in to update the Potter's House website.</p>
        <label className="adm-field">Email<input name="email" type="email" autoComplete="username" required /></label>
        <label className="adm-field">Password<input name="password" type="password" autoComplete="current-password" required /></label>
        {err && <Note kind="error">{err}</Note>}
        <button className="adm-btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <Link to="/" className="adm-back">Back to the website</Link>
      </form>
    </div>
  );
}

// ---------- Fields ----------

function FileField({ name, f, value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await api('/admin/upload', { method: 'POST', form });
      onChange(r.url);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  const isImg = /\.(jpe?g|png|webp)$/i.test(value || '');
  return (
    <div className="adm-field">
      <span>{f.label}{f.required ? ' *' : ''}</span>
      <div className="adm-file">
        {value && isImg && <img src={value} alt="" />}
        {value && !isImg && <a href={value} target="_blank" rel="noreferrer">{value.split('/').pop()}</a>}
        <label className="adm-btn">
          <Icon name="upload" size={16} /> {busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
          <input type="file" accept={f.accept} onChange={pick} hidden disabled={busy} />
        </label>
        {value && <button type="button" className="adm-btn ghost" onClick={() => onChange('')}>Remove</button>}
      </div>
      {err && <Note kind="error">{err}</Note>}
    </div>
  );
}

function Field({ name, f, value, onChange }) {
  const v = value ?? '';
  const label = `${f.label}${f.required ? ' *' : ''}`;
  if (f.type === 'file') return <FileField name={name} f={f} value={v} onChange={onChange} />;
  if (f.type === 'bool') {
    return <label className="adm-check"><input type="checkbox" checked={v === 1 || v === '1' || v === true} onChange={(e) => onChange(e.target.checked ? 1 : 0)} /> {f.label}</label>;
  }
  if (f.type === 'select') {
    return (
      <label className="adm-field">{label}
        <select value={v || f.default || ''} onChange={(e) => onChange(e.target.value)}>
          {f.options.map((o) => <option key={o} value={o}>{o === 'review' ? 'waiting for approval' : o}</option>)}
        </select>
      </label>
    );
  }
  if (f.type === 'textarea') return <label className="adm-field wide">{label}<textarea rows={6} value={v} maxLength={f.max} onChange={(e) => onChange(e.target.value)} /></label>;
  const type = { date: 'date', datetime: 'datetime-local', url: 'url', email: 'email' }[f.type] || 'text';
  const shown = f.type === 'datetime' && v ? v.replace(' ', 'T').slice(0, 16) : v;
  return <label className="adm-field">{label}<input type={type} value={shown} maxLength={f.max} onChange={(e) => onChange(e.target.value)} /></label>;
}

// ---------- Generic section (sermons, photos, events, announcements, testimonies, senders) ----------

const TITLE_KEY = { sermons: 'title', videos: 'title', photos: 'caption', events: 'title', announcements: 'title', testimonies: 'title', senders: 'email' };
const DATE_KEY = { sermons: 'preached_on', videos: 'posted_on', photos: 'taken_on', events: 'starts_at', announcements: 'ends_on', testimonies: 'created_at', senders: 'created_at' };

function Editor({ res, def, item, onSaved, onCancel }) {
  const blank = useMemo(() => Object.fromEntries(Object.entries(def.fields).map(([k, f]) => [k, f.default ?? (f.type === 'bool' ? 0 : '')])), [def]);
  const [v, setV] = useState(item ? { ...blank, ...item } : blank);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const body = Object.fromEntries(Object.keys(def.fields).map((k) => [k, v[k]]));
      const r = await api(`/admin/r/${res}${item ? '/' + item.id : ''}`, { method: 'POST', body });
      onSaved(r.item);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="adm-card adm-editor" onSubmit={save}>
      <h2>{item ? 'Edit' : 'Add'} {def.label.toLowerCase().replace(/s$/, '')}</h2>
      <div className="adm-grid">
        {Object.entries(def.fields).map(([k, f]) => <Field key={k} name={k} f={f} value={v[k]} onChange={(x) => setV((o) => ({ ...o, [k]: x }))} />)}
      </div>
      {err && <Note kind="error">{err}</Note>}
      <div className="adm-row">
        <button className="adm-btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="adm-btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function BulkPhotos({ categories, onDone }) {
  const [cat, setCat] = useState(categories[0] || 'Worship');
  const [caption, setCaption] = useState('');
  const [state, setState] = useState(null);
  const pick = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    let ok = 0;
    const errors = [];
    for (const [i, file] of files.entries()) {
      setState(`Uploading ${i + 1} of ${files.length}…`);
      try {
        const form = new FormData();
        form.append('file', file);
        const up = await api('/admin/upload', { method: 'POST', form });
        await api('/admin/r/photos', { method: 'POST', body: { file: up.url, caption, category: cat, status: 'live' } });
        ok += 1;
      } catch (x) {
        errors.push(`${file.name}: ${x.message}`);
      }
    }
    setState(`${ok} photo${ok === 1 ? '' : 's'} added.${errors.length ? ' ' + errors.join(' ') : ''}`);
    onDone();
  };
  return (
    <div className="adm-card adm-bulk">
      <h2>Add several photos</h2>
      <p>Pick photos from your phone or computer. They are straightened, sized for the web and lightly sharpened.</p>
      <div className="adm-grid">
        <label className="adm-field">Category<select value={cat} onChange={(e) => setCat(e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="adm-field">Caption for all (optional)<input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} /></label>
      </div>
      <label className="adm-btn primary"><Icon name="upload" size={16} /> Choose photos<input type="file" accept="image/*" multiple hidden onChange={pick} /></label>
      {state && <Note>{state}</Note>}
    </div>
  );
}

function ResourceSection({ res, schema }) {
  const def = schema.resources[res];
  const [items, setItems] = useState(null);
  const [edit, setEdit] = useState(null); // null | 'new' | item
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    api(`/admin/r/${res}?q=${encodeURIComponent(q)}&status=${status}`).then((r) => setItems(r.items)).catch((x) => setErr(x.message));
  }, [res, q, status]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  const remove = async (it) => {
    if (!window.confirm(`Delete "${it[TITLE_KEY[res]] || 'this item'}"? You can undo this under History & undo.`)) return;
    await api(`/admin/r/${res}/${it.id}/delete`, { method: 'POST', body: {} }).catch((x) => setErr(x.message));
    load();
  };
  const setLive = async (it, s) => {
    await api(`/admin/r/${res}/${it.id}`, { method: 'POST', body: { status: s } }).catch((x) => setErr(x.message));
    load();
  };

  if (edit) {
    return <Editor res={res} def={def} item={edit === 'new' ? null : edit} onCancel={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />;
  }
  const hasStatus = !!def.fields.status;
  return (
    <>
      <div className="adm-head">
        <h1>{def.label}</h1>
        <button className="adm-btn primary" onClick={() => setEdit('new')}><Icon name="plus" size={16} /> Add</button>
      </div>
      {res === 'senders' && (
        <Note>People on this list can email updates to the church update address. Others are ignored. Every emailed update waits in <a href="#inbox">Emailed updates</a> until an admin approves it.</Note>
      )}
      {res === 'videos' && (
        <Note>Paste a YouTube, TikTok or Facebook video link, or upload a short MP4. Videos show under Recent Moments on the Sermons and Home pages.</Note>
      )}
      {res === 'photos' && <BulkPhotos categories={schema.categories} onDone={load} />}
      <div className="adm-filters">
        <input type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        {hasStatus && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Show">
            <option value="">All</option><option value="live">Live</option><option value="review">Waiting for approval</option><option value="hidden">Hidden</option>
          </select>
        )}
      </div>
      {err && <Note kind="error">{err}</Note>}
      {!items ? <p>Loading…</p> : !items.length ? <div className="adm-empty">Nothing here yet.</div> : (
        <ul className={res === 'photos' ? 'adm-photos' : 'adm-list'}>
          {items.map((it) => (
            <li key={it.id}>
              {res === 'photos' && it.file && <img src={it.file.replace(/\.jpg$/, '-sm.jpg')} onError={(e) => { e.currentTarget.src = it.file; }} alt="" loading="lazy" />}
              {res !== 'photos' && it.cover && <img className="th" src={it.cover} alt="" loading="lazy" />}
              <div className="txt">
                <strong>{it[TITLE_KEY[res]] || <em>No caption</em>}</strong>
                <span>
                  {[res === 'photos' || res === 'videos' ? it.category : null, res === 'videos' ? linkName(it) : null, res === 'sermons' ? it.preacher : null, res === 'senders' ? it.name : null,
                    DATE_KEY[res] === 'starts_at' ? when(it.starts_at) : day(it[DATE_KEY[res]]),
                    it.source === 'email' ? 'by email' : null].filter(Boolean).join(' · ')}
                </span>
              </div>
              {hasStatus && <Badge s={it.status} />}
              <div className="acts">
                {hasStatus && it.status !== 'live' && <button className="adm-btn small" onClick={() => setLive(it, 'live')}>Publish</button>}
                {hasStatus && it.status === 'live' && <button className="adm-btn small ghost" onClick={() => setLive(it, 'hidden')}>Hide</button>}
                <button className="adm-icon" onClick={() => setEdit(it)} aria-label="Edit"><Icon name="edit" size={18} /></button>
                <button className="adm-icon" onClick={() => remove(it)} aria-label="Delete"><Icon name="trash" size={18} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ---------- Emailed updates ----------

function TagHelp({ address }) {
  return (
    <div className="adm-card">
      <h2>How to send an update</h2>
      <p>Email <b>{address || 'the update address (set it in Settings)'}</b> from an approved address. Start the subject with a tag:</p>
      <table className="adm-table">
        <thead><tr><th>Subject starts with</th><th>Example</th><th>Goes to</th></tr></thead>
        <tbody>
          <tr><td>Sermon:</td><td>Sermon: Faith that moves mountains</td><td>Sermons page. Attach audio or video, or paste a YouTube link. Add lines like "Preacher: …", "Scripture: …", "Date: …".</td></tr>
          <tr><td>Photo:</td><td>Photo: Outreach, Kibuku visit</td><td>Gallery, under the category you name first (Worship, Outreach, Special service, Bible Study, Fellowship, Building).</td></tr>
          <tr><td>Event:</td><td>Event: Youth crusade</td><td>Events page. Add "Date: 14 Dec 2026", "Time: 2pm", "Venue: …".</td></tr>
          <tr><td>Announcement:</td><td>Announcement: No evening prayer this Friday</td><td>Banner on every page. Add "Until: 20 Dec" to choose when it ends.</td></tr>
          <tr><td>Times:</td><td>Times: new prayer time</td><td>Weekly times. Lines like "Prayer day: Wednesday", "Prayer time: 6:30pm – 8:30pm".</td></tr>
          <tr><td>Video:</td><td>Video: Outreach, Kibuku songs</td><td>Videos (Recent Moments). Paste one or more YouTube, TikTok or Facebook links, or attach a short MP4. A category first is optional.</td></tr>
          <tr><td>Testimony:</td><td>Testimony: Healed after prayer</td><td>Testimonies, always checked before they show.</td></tr>
        </tbody>
      </table>
      <p className="adm-muted">No tag? The website makes a best guess from the email (preacher or audio means a sermon, a YouTube or TikTok link means a video, photos only means the gallery). Nothing goes on the site until an admin approves it here or with the link in the alert email. If it can't tell, the sender gets a reply asking for a tag.</p>
    </div>
  );
}

function Inbox() {
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState('review');
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState({});
  const load = useCallback(() => api('/admin/inbox?status=' + filter).then((r) => setItems(r.items)).catch((x) => setInfo({ kind: 'error', text: x.message })), [filter]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api('/admin/settings').then((r) => setSettings({ ...r.settings, last_run: r.last_run })).catch(() => {}); }, []);
  const run = async () => {
    setBusy(true);
    setInfo(null);
    try {
      const r = await api('/admin/inbox/run', { method: 'POST', body: {} });
      setInfo({ kind: r.ok ? 'ok' : 'error', text: r.ok ? `Checked the mailbox: ${r.processed} new email${r.processed === 1 ? '' : 's'}.` : r.message });
      load();
    } catch (x) {
      setInfo({ kind: 'error', text: x.message });
    } finally {
      setBusy(false);
    }
  };
  const decide = async (it, ok) => {
    await api(`/admin/inbox/${it.id}/${ok ? 'approve' : 'reject'}`, { method: 'POST', body: {} }).catch((x) => setInfo({ kind: 'error', text: x.message }));
    load();
  };
  return (
    <>
      <div className="adm-head">
        <h1>Emailed updates</h1>
        <button className="adm-btn primary" onClick={run} disabled={busy}><Icon name="refresh" size={16} /> {busy ? 'Checking…' : 'Check mailbox now'}</button>
      </div>
      <p className="adm-muted">The mailbox is checked automatically every 5 minutes{settings.last_run ? `. Last check: ${when(settings.last_run)}` : ''}.</p>
      {info && <Note kind={info.kind}>{info.text}</Note>}
      <div className="adm-filters">
        {[['review', 'Waiting for you'], ['published', 'Published'], ['rejected', 'Rejected'], ['ignored', 'Ignored'], ['', 'All']].map(([k, l]) => (
          <button key={k} className={'adm-chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      {!items ? <p>Loading…</p> : !items.length ? <div className="adm-empty">{filter === 'review' ? 'Nothing waiting. Emailed updates that need a check appear here.' : 'Nothing here yet.'}</div> : (
        <ul className="adm-list">
          {items.map((it) => (
            <li key={it.id}>
              <div className="txt">
                <strong>{it.subject || '(no subject)'}</strong>
                <span>{[it.from_name || it.from_email, when(it.received_at), it.target_type].filter(Boolean).join(' · ')}</span>
                {it.note && <span className="adm-muted pre">{it.note}</span>}
              </div>
              <Badge s={it.status} />
              {it.status === 'review' && (
                <div className="acts">
                  <button className="adm-btn small primary" onClick={() => decide(it, true)}>Approve</button>
                  <button className="adm-btn small ghost" onClick={() => decide(it, false)}>Reject</button>
                  {it.target_type && it.target_type !== 'times' && <a className="adm-btn small ghost" href={'#' + ({ sermon: 'sermons', photo: 'photos', event: 'events', announcement: 'announcements', testimony: 'testimonies' }[it.target_type] || '')}>Edit first</a>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <TagHelp address={settings.inbox_address} />
    </>
  );
}

// ---------- Giving ----------

function Gifts() {
  const first = new Date();
  first.setDate(1);
  const iso = (d) => d.toISOString().slice(0, 10);
  const [from, setFrom] = useState(iso(first));
  const [to, setTo] = useState(iso(new Date()));
  const [r, setR] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api(`/admin/gifts?from=${from}&to=${to}`).then(setR).catch((x) => setErr(x.message)); }, [from, to]);
  const total = r ? r.by_fund.reduce((a, f) => a + Number(f.total), 0) : 0;
  return (
    <>
      <div className="adm-head">
        <h1>Giving</h1>
        <a className="adm-btn" href={`/api/admin/gifts.csv?from=${from}&to=${to}`}>Download for Excel</a>
      </div>
      <div className="adm-filters">
        <label>From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      {err && <Note kind="error">{err}</Note>}
      {r && (
        <>
          <div className="adm-stats">
            <div><b>UGX {fmt(total)}</b><span>received</span></div>
            {r.by_fund.map((f) => <div key={f.fund}><b>UGX {fmt(f.total)}</b><span>{r.funds[f.fund] || f.fund} · {f.count} gift{f.count == 1 ? '' : 's'}</span></div>)}
          </div>
          {!r.items.length ? <div className="adm-empty">No gifts in these dates.</div> : (
            <div className="adm-scroll">
              <table className="adm-table">
                <thead><tr><th>Date</th><th>Amount</th><th>Fund</th><th>From</th><th>Status</th><th>Reference</th></tr></thead>
                <tbody>
                  {r.items.map((g) => (
                    <tr key={g.id}>
                      <td>{when(g.created_at)}</td><td>UGX {fmt(g.amount)}</td><td>{r.funds[g.fund] || g.fund}</td>
                      <td>{g.name || '—'}<br /><span className="adm-muted">{g.network} {g.phone.replace(/^256/, '0')}</span></td>
                      <td><Badge s={g.status} />{g.message && <div className="adm-muted">{g.message}</div>}</td>
                      <td className="mono">{g.ref}<br /><span className="adm-muted">{g.provider_ref}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ---------- Messages ----------

function Messages() {
  const [kind, setKind] = useState('prayer');
  const [items, setItems] = useState(null);
  const load = useCallback(() => api('/admin/messages?kind=' + kind).then((r) => setItems(r.items)), [kind]);
  useEffect(() => { load(); }, [load]);
  const mark = async (m) => { await api(`/admin/messages/${m.id}`, { method: 'POST', body: { handled: !Number(m.handled) } }); load(); };
  const del = async (m) => { if (window.confirm('Delete this message?')) { await api(`/admin/messages/${m.id}/delete`, { method: 'POST', body: {} }); load(); } };
  return (
    <>
      <div className="adm-head"><h1>Prayer &amp; messages</h1></div>
      <div className="adm-filters">
        {[['prayer', 'Prayer requests'], ['contact', 'Messages']].map(([k, l]) => <button key={k} className={'adm-chip' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{l}</button>)}
      </div>
      {!items ? <p>Loading…</p> : !items.length ? <div className="adm-empty">Nothing yet.</div> : (
        <ul className="adm-list">
          {items.map((m) => (
            <li key={m.id} className={Number(m.handled) ? 'done' : ''}>
              <div className="txt">
                <strong>{m.name || 'Anonymous'}{m.topic ? ` · ${m.topic}` : ''}{Number(m.private) ? ' · private, pastors only' : ''}</strong>
                <span>{[m.contact, when(m.created_at)].filter(Boolean).join(' · ')}</span>
                <span className="pre">{m.body}</span>
              </div>
              <div className="acts">
                <button className="adm-btn small ghost" onClick={() => mark(m)}>{Number(m.handled) ? 'Mark as new' : kind === 'prayer' ? 'Prayed for' : 'Answered'}</button>
                <button className="adm-icon" onClick={() => del(m)} aria-label="Delete"><Icon name="trash" size={18} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ---------- Settings ----------

const SETTING_GROUPS = [
  ['Update mailbox', 'People email photos, sermons and news here. Create the mailbox in Hostinger (Emails), then enter it here.', [
    ['inbox_address', 'Church update email address', 'email', 'updates@pottershouseoutreachministriesinternational.com'],
    ['imap_user', 'Mailbox sign-in (usually the same address)', 'email', ''],
    ['imap_pass', 'Mailbox password', 'password', ''],
    ['imap_host', 'Mail server', 'text', 'imap.hostinger.com'],
    ['imap_port', 'Port', 'text', '993'],
    ['notify_email', 'Send alerts (approvals, prayer requests, gifts) to', 'text', 'pastor@example.com, office@example.com']
  ]],
  ['Weekly times', 'Shown across the site. Leave blank to keep the current wording.', [
    ['times_sunday', 'Sunday service', 'text', 'Every Sunday · 8:30am – 12:00pm'],
    ['times_prayer_day', 'Prayer day', 'text', 'Wednesday'],
    ['times_prayer_time', 'Prayer time', 'text', '6:30pm – 8:30pm'],
    ['times_bible_day', 'Bible study day', 'text', 'Thursday'],
    ['times_bible_time', 'Bible study time', 'text', '5:00pm – 7:00pm']
  ]],
  ['Contact details', 'Leave blank to keep the current details.', [
    ['phones', 'Phone numbers (comma between them)', 'text', '+256 772 496 781, +256 761 838 682'],
    ['whatsapp', 'WhatsApp number', 'text', '+256 775 672 762'],
    ['email', 'Public email address', 'email', 'church@pottershouseoutreachministriesinternational.com']
  ]],
  ['Video and social pages', 'Links to the church pages. They show in the footer and on the Sermons page.', [
    ['youtube', 'YouTube channel', 'url', 'https://www.youtube.com/@yourchurch'],
    ['tiktok', 'TikTok page', 'url', 'https://www.tiktok.com/@yourchurch'],
    ['facebook', 'Facebook page', 'url', 'https://www.facebook.com/…'],
    ['instagram', 'Instagram', 'url', 'https://www.instagram.com/…']
  ]],
  ['Giving details', 'The registered Mobile Money names let givers check they are paying the church.', [
    ['momo_mtn_number', 'MTN MoMo number', 'text', '0772 000000'],
    ['momo_mtn_name', 'Name MTN shows', 'text', "POTTER'S HOUSE OUTREACH MIN"],
    ['momo_airtel_number', 'Airtel Money number', 'text', '0752 000000'],
    ['momo_airtel_name', 'Name Airtel shows', 'text', ''],
    ['bank_name', 'Bank and branch', 'text', 'Stanbic Bank, Mbale'],
    ['bank_account', 'Account number', 'text', ''],
    ['bank_swift', 'SWIFT / BIC (for gifts from abroad)', 'text', '']
  ]]
];

function Settings() {
  const [s, setS] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState('');
  useEffect(() => { api('/admin/settings').then((r) => setS({ ...r.settings, imap_pass: '' , _saved_pass: r.settings.imap_pass })).catch((x) => setInfo({ kind: 'error', text: x.message })); }, []);
  if (!s) return info ? <Note kind="error">{info.text}</Note> : <p>Loading…</p>;
  const save = async (e) => {
    e?.preventDefault();
    setBusy('save');
    setInfo(null);
    try {
      const body = Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith('_')));
      const r = await api('/admin/settings', { method: 'POST', body });
      setS({ ...r.settings, imap_pass: '', _saved_pass: r.settings.imap_pass });
      setInfo({ kind: 'ok', text: 'Saved. The website shows the changes within a minute.' });
    } catch (x) {
      setInfo({ kind: 'error', text: x.message });
    } finally {
      setBusy('');
    }
  };
  const test = async () => {
    await save();
    setBusy('test');
    try {
      const r = await api('/admin/inbox/test', { method: 'POST', body: {} });
      setInfo({ kind: 'ok', text: r.message });
    } catch (x) {
      setInfo({ kind: 'error', text: x.message });
    } finally {
      setBusy('');
    }
  };
  return (
    <form onSubmit={save}>
      <div className="adm-head"><h1>Settings</h1><button className="adm-btn primary" disabled={!!busy}>{busy === 'save' ? 'Saving…' : 'Save'}</button></div>
      {info && <Note kind={info.kind}>{info.text}</Note>}
      {SETTING_GROUPS.map(([title, help, fields]) => (
        <section className="adm-card" key={title}>
          <h2>{title}</h2>
          <p className="adm-muted">{help}</p>
          <div className="adm-grid">
            {fields.map(([k, label, type, ph]) => {
              if (type.startsWith('select:')) {
                const opts = type.slice(7).split('|').map((o) => o.split('='));
                return <label key={k} className="adm-field">{label}<select value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>;
              }
              return (
                <label key={k} className="adm-field">{label}
                  <input type={type} value={s[k] ?? ''} placeholder={k === 'imap_pass' && s._saved_pass ? 'Saved. Type a new one to change it' : ph} autoComplete={type === 'password' ? 'new-password' : 'off'} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
                </label>
              );
            })}
          </div>
          {title === 'Update mailbox' && <button type="button" className="adm-btn" onClick={test} disabled={!!busy}>{busy === 'test' ? 'Connecting…' : 'Save and test the mailbox'}</button>}
        </section>
      ))}
    </form>
  );
}

// ---------- Account ----------

function Account({ admin, onOut }) {
  const [admins, setAdmins] = useState([]);
  const [info, setInfo] = useState(null);
  const load = () => api('/admin/admins').then((r) => setAdmins(r.items)).catch(() => {});
  useEffect(() => { load(); }, []);
  const change = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form));
    try {
      await api('/admin/password', { method: 'POST', body: f });
      form.reset();
      setInfo({ kind: 'ok', text: 'Password changed.' });
    } catch (x) {
      setInfo({ kind: 'error', text: x.message });
    }
  };
  const add = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form));
    try {
      const r = await api('/admin/admins', { method: 'POST', body: f });
      setAdmins(r.items);
      form.reset();
      setInfo({ kind: 'ok', text: `${f.email} can now sign in. Share the password with them privately.` });
    } catch (x) {
      setInfo({ kind: 'error', text: x.message });
    }
  };
  const remove = async (a) => {
    if (!window.confirm(`Remove ${a.email}?`)) return;
    await api(`/admin/admins/${a.id}/delete`, { method: 'POST', body: {} }).catch((x) => setInfo({ kind: 'error', text: x.message }));
    load();
  };
  const out = async () => { await api('/admin/logout', { method: 'POST', body: {} }).catch(() => {}); onOut(); };
  return (
    <>
      <div className="adm-head"><h1>Account</h1><button className="adm-btn" onClick={out}><Icon name="out" size={16} /> Sign out</button></div>
      {info && <Note kind={info.kind}>{info.text}</Note>}
      <form className="adm-card" onSubmit={change}>
        <h2>Change your password</h2>
        <p className="adm-muted">Signed in as {admin.email}</p>
        <div className="adm-grid">
          <label className="adm-field">Current password<input name="current" type="password" autoComplete="current-password" required /></label>
          <label className="adm-field">New password (10+ characters)<input name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
        </div>
        <button className="adm-btn primary">Change password</button>
      </form>
      <section className="adm-card">
        <h2>People who can sign in</h2>
        <ul className="adm-list">
          {admins.map((a) => (
            <li key={a.id}>
              <div className="txt"><strong>{a.name || a.email}</strong><span>{a.email}{a.last_login ? ` · last signed in ${when(a.last_login)}` : ' · never signed in'}</span></div>
              {a.id !== admin.id && <div className="acts"><button className="adm-icon" onClick={() => remove(a)} aria-label="Remove"><Icon name="trash" size={18} /></button></div>}
            </li>
          ))}
        </ul>
        <form onSubmit={add} className="adm-grid" style={{ marginTop: 16 }}>
          <label className="adm-field">Name<input name="name" /></label>
          <label className="adm-field">Email<input name="email" type="email" required /></label>
          <label className="adm-field">Password for them<input name="password" type="text" minLength={10} required autoComplete="off" /></label>
          <div><button className="adm-btn">Add person</button></div>
        </form>
      </section>
    </>
  );
}

// ---------- History & undo ----------

const ACTION_WORD = { create: 'Added', update: 'Changed', delete: 'Deleted', settings: 'Settings' };

function History() {
  const [items, setItems] = useState(null);
  const [info, setInfo] = useState(null);
  const load = useCallback(() => api('/admin/changes').then((r) => setItems(r.items)).catch((x) => setInfo({ kind: 'error', text: x.message })), []);
  useEffect(() => { load(); }, [load]);
  const undo = async (c) => {
    if (!window.confirm(`Undo this change?\n\n${c.summary}`)) return;
    try {
      await api(`/admin/changes/${c.id}/undo`, { method: 'POST', body: {} });
      setInfo({ kind: 'ok', text: 'Undone. The website shows the earlier version again.' });
    } catch (x) {
      setInfo({ kind: 'error', text: x.message });
    }
    load();
  };
  return (
    <>
      <div className="adm-head"><h1>History &amp; undo</h1><button className="adm-btn" onClick={load}><Icon name="refresh" size={16} /> Refresh</button></div>
      <Note>Every change to the website is listed here, newest first, with who made it. Undo puts things back the way they were before that change. If something was changed again later, undo the later change first.</Note>
      {info && <Note kind={info.kind}>{info.text}</Note>}
      {!items ? <p>Loading…</p> : !items.length ? <div className="adm-empty">No changes yet.</div> : (
        <ul className="adm-list">
          {items.map((c) => (
            <li key={c.id} className={c.undone_at ? 'undone' : ''}>
              <div className="txt">
                <strong>{c.summary}</strong>
                <span>{[ACTION_WORD[c.action] || c.action, when(c.created_at), c.actor, c.undone_at ? `undone ${when(c.undone_at)} by ${c.undone_by}` : null].filter(Boolean).join(' · ')}</span>
              </div>
              <div className="acts">
                {!c.undone_at && !c.summary.startsWith('Undid') && <button className="adm-btn small ghost" onClick={() => undo(c)}>Undo</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ---------- Overview ----------

function Dashboard() {
  const [s, setS] = useState(null);
  useEffect(() => { api('/admin/stats').then(setS).catch(() => {}); }, []);
  if (!s) return <p>Loading…</p>;
  const checks = [
    [s.inbox_ready, 'Update mailbox connected', 'settings'],
    [s.payments !== 'off', s.payments !== 'off' ? `Phone prompts for giving are on (${s.payments === 'yo' ? 'Yo! Payments' : s.payments})` : 'Phone prompts for giving are off: givers use the dial code for now', 'gifts']
  ];
  return (
    <>
      <div className="adm-head"><h1>Overview</h1><Link className="adm-btn" to="/" target="_blank">View website</Link></div>
      <div className="adm-stats">
        <a href="#inbox"><b>{s.review}</b><span>emailed updates waiting</span></a>
        <a href="#messages"><b>{s.messages}</b><span>new prayer requests &amp; messages</span></a>
        <a href="#gifts"><b>UGX {fmt(s.gifts_month)}</b><span>given this month ({s.gifts_count})</span></a>
        <a href="#sermons"><b>{s.sermons}</b><span>sermons</span></a>
        <a href="#photos"><b>{s.photos}</b><span>gallery photos</span></a>
        <a href="#events"><b>{s.events}</b><span>upcoming events</span></a>
      </div>
      <section className="adm-card">
        <h2>Set-up</h2>
        <ul className="adm-checks">
          {checks.map(([ok, text, link]) => <li key={text} className={ok ? 'ok' : ''}><Icon name={ok ? 'check' : 'clock'} size={18} /> <a href={'#' + link}>{text}</a></li>)}
        </ul>
        {s.last_run && <p className="adm-muted">Mailbox last checked {when(s.last_run)}.</p>}
      </section>
    </>
  );
}

// ---------- Shell ----------

export default function Admin() {
  const [admin, setAdmin] = useState(undefined);
  const [schema, setSchema] = useState(null);
  const [down, setDown] = useState('');
  const [menu, setMenu] = useState(false);
  const section = useHash();
  const main = useRef();

  useEffect(() => {
    document.title = "Admin | Potter's House";
    let m = document.querySelector('meta[name="robots"]');
    if (!m) { m = document.createElement('meta'); m.name = 'robots'; document.head.appendChild(m); }
    m.content = 'noindex, nofollow';
    api('/admin/me').then((r) => setAdmin(r.admin)).catch((x) => {
      if (x.status === 401) setAdmin(null);
      else { setDown(x.message); setAdmin(null); }
    });
  }, []);
  useEffect(() => { if (admin) api('/admin/schema').then(setSchema).catch((x) => setDown(x.message)); }, [admin]);
  useEffect(() => { setMenu(false); main.current?.focus(); }, [section]);

  if (admin === undefined) return <div className="adm-login"><p>Loading…</p></div>;
  if (!admin) {
    return (
      <>
        {down && <div className="adm-down"><Note kind="error">{down} The admin page needs the website server (see the setup guide).</Note></div>}
        <Login onIn={setAdmin} />
      </>
    );
  }
  const current = SECTIONS.find(([k]) => k === section) ? section : 'dashboard';
  let body;
  if (!schema) body = <p>Loading…</p>;
  else if (current === 'dashboard') body = <Dashboard />;
  else if (current === 'inbox') body = <Inbox />;
  else if (current === 'gifts') body = <Gifts />;
  else if (current === 'messages') body = <Messages />;
  else if (current === 'settings') body = <Settings />;
  else if (current === 'history') body = <History />;
  else if (current === 'account') body = <Account admin={admin} onOut={() => setAdmin(null)} />;
  else body = <ResourceSection key={current} res={current} schema={schema} />;

  return (
    <div className="adm">
      <header className="adm-top">
        <button className="adm-menu" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Menu"><Icon name={menu ? 'close' : 'menu'} size={22} /></button>
        <Link to="/" className="adm-brand"><Seal size={36} /><span>Potter's House <small>Admin</small></span></Link>
        <span className="adm-who">{admin.name || admin.email}</span>
      </header>
      <nav className={'adm-nav' + (menu ? ' open' : '')} aria-label="Admin sections">
        {SECTIONS.map(([k, label, icon]) => (
          <a key={k} href={'#' + k} aria-current={current === k ? 'page' : undefined}><Icon name={icon} size={18} /> {label}</a>
        ))}
      </nav>
      <main className="adm-main" ref={main} tabIndex={-1}>{body}</main>
    </div>
  );
}
