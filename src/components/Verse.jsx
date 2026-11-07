import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useOverlay } from './Overlay.jsx';
import { api } from '../api.js';
import { CHURCH } from '../data.js';
import { T, useLang, useT } from '../i18n.jsx';

const trTag = (v) => (v.translation === 'lug' ? 'Luganda' : (v.translation || 'kjv').toUpperCase());
const readLink = (v) => `/bible?ref=${encodeURIComponent(v.ref)}${v.translation && v.translation !== 'kjv' ? `&tr=${v.translation}` : ''}`;
export const shareText = (v) => `“${v.text}”\n${v.ref} (${trTag(v)})\n\n${window.location.origin}${readLink(v)}`;

// 0772 123456 → 256772123456 (Uganda); +44… stays as typed digits
export const intlDigits = (raw) => {
  let d = String(raw || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d.slice(1);
  if (d.startsWith('00')) return d.slice(2);
  if (d.length === 10 && d.startsWith('0')) return '256' + d.slice(1);
  if (d.length === 9) return '256' + d;
  return d;
};

// Send a verse to someone's phone from your own phone: SMS or WhatsApp, with the verse already typed in.
export function SendTo({ text, id = 'send', light }) {
  const [open, setOpen] = useState(false);
  const [num, setNum] = useState('');
  const d = intlDigits(num);
  const ok = d.length >= 9;
  const t = useT();
  if (!open) return <button type="button" className={'linkbtn' + (light ? ' light' : '')} onClick={() => setOpen(true)}><T k="verse.sendTo" /></button>;
  return (
    <div className="sendto">
      <label className="field" htmlFor={`${id}-num`}><T k="verse.theirNumber" /></label>
      <div className="sendto-row">
        <input id={`${id}-num`} type="tel" inputMode="tel" autoComplete="off" placeholder="0772 123456" value={num} onChange={(e) => setNum(e.target.value)} />
        <a className={'btn btn-gold' + (ok ? '' : ' off')} aria-disabled={!ok} href={ok ? `sms:+${d}?&body=${encodeURIComponent(text)}` : undefined}>SMS</a>
        <a className={'btn btn-navy' + (ok ? '' : ' off')} aria-disabled={!ok} href={ok ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : undefined} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      </div>
      <p className="small">{t('verse.sendNote')}</p>
    </div>
  );
}

// Share, copy and picture buttons for one verse
export function VerseActions({ v, light }) {
  const { copy } = useOverlay();
  const t = useT();
  const pic = (s) => `${v.image}&s=${s}`;
  return (
    <div className="verse-acts">
      <a className={'btn ' + (light ? 'btn-light' : 'btn-gold')} href={`https://wa.me/?text=${encodeURIComponent(shareText(v))}`} target="_blank" rel="noopener noreferrer">
        <Icon name="chat" size={16} /> <T k="verse.shareWa" />
      </a>
      <button type="button" className="linkbtn" onClick={() => copy(shareText(v), t('verse.theVerse'))}><T k="verse.copy" /></button>
      {v.image && <a className="linkbtn" href={pic('post') + '&download=1'} download><T k="verse.picPost" /></a>}
      {v.image && <a className="linkbtn" href={pic('story') + '&download=1'} download><T k="verse.picStory" /></a>}
      <SendTo text={shareText(v)} id={`send-${v.kind}`} light={light} />
    </div>
  );
}

// The Verse of the Day (or Week) as a card
export function VerseCard({ v, label, compact }) {
  const t = useT();
  if (!v || !v.text) return null;
  return (
    <figure className={'verse-card' + (compact ? ' compact' : '')}>
      <p className="eyebrow">{label || t(v.kind === 'week' ? 'verse.week' : 'verse.day')} · {v.theme}</p>
      <blockquote>“{v.text}”</blockquote>
      <figcaption>
        <Link to={readLink(v)}>{v.ref}</Link> <span>({trTag(v)})</span>
      </figcaption>
      {v.note && <p className="note">{v.note}</p>}
      <VerseActions v={v} light />
    </figure>
  );
}

// Sign-up for the verse emails
export function Subscribe({ id = 'subscribe', title }) {
  const t = useT();
  const { lang } = useLang();
  const [state, setState] = useState({ busy: false, done: '', err: '' });
  const submit = async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const d = Object.fromEntries(new FormData(f));
    setState({ busy: true, done: '', err: '' });
    try {
      const r = await api('/subscribe', { method: 'POST', body: { ...d, daily: !!d.daily, weekly: !!d.weekly, sms: !!d.sms, call: !!d.call, lang } });
      setState({ busy: false, done: r.message, err: '' });
      f.reset();
    } catch (x) {
      setState({ busy: false, done: '', err: x.message || t('verse.failed') });
    }
  };
  return (
    <form className="subscribe" id={id} onSubmit={submit}>
      <h3>{title || <T k="verse.signupTitle" />}</h3>
      <p><T k="verse.signupText" /></p>
      <div className="row">
        <label className="field"><T k="verse.name" /><input name="name" id={`${id}-name`} autoComplete="name" /></label>
        <label className="field"><T k="verse.email" /><input name="email" id={`${id}-email`} type="email" autoComplete="email" /></label>
        <label className="field"><T k="verse.phone" /><input name="phone" id={`${id}-phone`} type="tel" inputMode="tel" autoComplete="tel" placeholder="0772 123456" /></label>
      </div>
      <div className="checks">
        <label><input type="checkbox" name="daily" id={`${id}-daily`} defaultChecked /> <T k="verse.daily" /></label>
        <label><input type="checkbox" name="weekly" id={`${id}-weekly`} defaultChecked /> <T k="verse.weekly" /></label>
        <label><input type="checkbox" name="sms" id={`${id}-sms`} /> <T k="verse.sms" /></label>
        <label><input type="checkbox" name="call" id={`${id}-call`} /> <T k="verse.call" /></label>
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
      <div className="btn-row">
        <button className="btn btn-gold" disabled={state.busy}>{state.busy ? t('common.sending') : t('verse.signup')}</button>
        {CHURCH.whatsappChannel && (
          <a className="btn btn-light" href={CHURCH.whatsappChannel} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={16} /> <T k="verse.followWa" /></a>
        )}
      </div>
      {state.done && <p className="ok" role="status">{state.done}</p>}
      {state.err && <p className="err" role="alert">{state.err}</p>}
      <p className="small"><T k="verse.privacy" /></p>
    </form>
  );
}
