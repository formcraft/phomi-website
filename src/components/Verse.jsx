import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useOverlay } from './Overlay.jsx';
import { api } from '../api.js';
import { CHURCH } from '../data.js';

export const shareText = (v) => `“${v.text}”\n${v.ref} (${(v.translation || 'kjv').toUpperCase()})\n\n${window.location.origin}/bible?ref=${encodeURIComponent(v.ref)}`;

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
  if (!open) return <button type="button" className={'linkbtn' + (light ? ' light' : '')} onClick={() => setOpen(true)}>Send to a number</button>;
  return (
    <div className="sendto">
      <label className="field" htmlFor={`${id}-num`}>Their phone number</label>
      <div className="sendto-row">
        <input id={`${id}-num`} type="tel" inputMode="tel" autoComplete="off" placeholder="0772 123456" value={num} onChange={(e) => setNum(e.target.value)} />
        <a className={'btn btn-gold' + (ok ? '' : ' off')} aria-disabled={!ok} href={ok ? `sms:+${d}?&body=${encodeURIComponent(text)}` : undefined}>SMS</a>
        <a className={'btn btn-navy' + (ok ? '' : ' off')} aria-disabled={!ok} href={ok ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : undefined} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      </div>
      <p className="small">Opens your phone's messages or WhatsApp with the verse typed in. Normal SMS charges apply.</p>
    </div>
  );
}

// Share, copy and picture buttons for one verse
export function VerseActions({ v, light }) {
  const { copy } = useOverlay();
  const pic = (s) => `${v.image}&s=${s}`;
  return (
    <div className="verse-acts">
      <a className={'btn ' + (light ? 'btn-light' : 'btn-gold')} href={`https://wa.me/?text=${encodeURIComponent(shareText(v))}`} target="_blank" rel="noopener noreferrer">
        <Icon name="chat" size={16} /> Share on WhatsApp
      </a>
      <button type="button" className="linkbtn" onClick={() => copy(shareText(v), 'the verse')}>Copy</button>
      {v.image && <a className="linkbtn" href={pic('post') + '&download=1'} download>Picture for Facebook</a>}
      {v.image && <a className="linkbtn" href={pic('story') + '&download=1'} download>Picture for WhatsApp status</a>}
      <SendTo text={shareText(v)} id={`send-${v.kind}`} light={light} />
    </div>
  );
}

// The Verse of the Day (or Week) as a card
export function VerseCard({ v, label, compact }) {
  if (!v || !v.text) return null;
  return (
    <figure className={'verse-card' + (compact ? ' compact' : '')}>
      <p className="eyebrow">{label || (v.kind === 'week' ? 'Verse of the Week' : 'Verse of the Day')} · {v.theme}</p>
      <blockquote>“{v.text}”</blockquote>
      <figcaption>
        <Link to={`/bible?ref=${encodeURIComponent(v.ref)}`}>{v.ref}</Link> <span>({(v.translation || 'kjv').toUpperCase()})</span>
      </figcaption>
      {v.note && <p className="note">{v.note}</p>}
      <VerseActions v={v} light />
    </figure>
  );
}

// Sign-up for the verse emails
export function Subscribe({ id = 'subscribe', title = 'Get the daily verse' }) {
  const [state, setState] = useState({ busy: false, done: '', err: '' });
  const submit = async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const d = Object.fromEntries(new FormData(f));
    setState({ busy: true, done: '', err: '' });
    try {
      const r = await api('/subscribe', { method: 'POST', body: { ...d, daily: !!d.daily, weekly: !!d.weekly, sms: !!d.sms } });
      setState({ busy: false, done: r.message, err: '' });
      f.reset();
    } catch (x) {
      setState({ busy: false, done: '', err: x.message || 'That did not work. Please try again.' });
    }
  };
  return (
    <form className="subscribe" id={id} onSubmit={submit}>
      <h3>{title}</h3>
      <p>A verse each morning by email or SMS, and a Monday letter with the Verse of the Week, the latest sermon and coming events. Free, and you can stop any time.</p>
      <div className="row">
        <label className="field">Your name<input name="name" id={`${id}-name`} autoComplete="name" /></label>
        <label className="field">Email address<input name="email" id={`${id}-email`} type="email" autoComplete="email" /></label>
        <label className="field">Phone for SMS (optional)<input name="phone" id={`${id}-phone`} type="tel" inputMode="tel" autoComplete="tel" placeholder="0772 123456" /></label>
      </div>
      <div className="checks">
        <label><input type="checkbox" name="daily" id={`${id}-daily`} defaultChecked /> Verse of the Day by email</label>
        <label><input type="checkbox" name="weekly" id={`${id}-weekly`} defaultChecked /> Weekly letter</label>
        <label><input type="checkbox" name="sms" id={`${id}-sms`} /> Verse of the Day by SMS</label>
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
      <div className="btn-row">
        <button className="btn btn-gold" disabled={state.busy}>{state.busy ? 'Sending…' : 'Sign up'}</button>
        {CHURCH.whatsappChannel && (
          <a className="btn btn-light" href={CHURCH.whatsappChannel} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={16} /> Follow on WhatsApp</a>
        )}
      </div>
      {state.done && <p className="ok" role="status">{state.done}</p>}
      {state.err && <p className="err" role="alert">{state.err}</p>}
    </form>
  );
}
