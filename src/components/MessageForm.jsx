import { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { useOverlay } from './Overlay.jsx';
import { CHURCH } from '../data.js';

// Builds the visitor's message and hands it to WhatsApp, where they press send.
function Ready({ text, onAgain, heading }) {
  const { copy } = useOverlay();
  const url = `https://wa.me/${CHURCH.whatsappDigits}?text=${encodeURIComponent(text)}`;
  return (
    <div className="status" tabIndex={-1} ref={(el) => el && el.focus()}>
      {heading}
      <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="check" size={20} /> Your message is ready.
      </strong>
      <span>Send it to the church office on WhatsApp. If WhatsApp does not open, copy the text and send it to {CHURCH.whatsapp}.</span>
      <pre className="msgprev">{text}</pre>
      <div className="btn-row">
        <a className="btn btn-navy" href={url} target="_blank" rel="noopener noreferrer">
          <Icon name="chat" size={18} /> Open WhatsApp
        </a>
        <button className="btn btn-light" type="button" onClick={() => copy(text, 'your message')}>Copy text</button>
        <button className="btn btn-light" type="button" onClick={onAgain}>Write another</button>
      </div>
    </div>
  );
}

export function ContactForm({ id, button = 'Send' }) {
  const [text, setText] = useState(null);
  const [err, setErr] = useState('');
  const form = useRef();

  const submit = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (!f.first.trim()) return setErr('Please add your first name.');
    if (!f.message.trim()) return setErr('Please write a message.');
    const lines = [`Message for PHOMI`, `From: ${f.first.trim()} ${f.last.trim()}`.trim()];
    if (f.phone.trim()) lines.push(`Phone: ${f.phone.trim()}`);
    if (f.email.trim()) lines.push(`Email: ${f.email.trim()}`);
    setText(lines.join('\n') + `\n\n${f.message.trim()}`);
  };

  if (text) return <Ready text={text} onAgain={() => setText(null)} />;
  return (
    <form className="stack" ref={form} onSubmit={submit} onInput={() => setErr('')} noValidate>
      <div className="grid-2">
        <label className="field">First name<input id={`${id}-first`} name="first" autoComplete="given-name" required /></label>
        <label className="field">Last name<input id={`${id}-last`} name="last" autoComplete="family-name" /></label>
        <label className="field">Phone<input id={`${id}-phone`} type="tel" name="phone" autoComplete="tel" /></label>
        <label className="field">Email<input id={`${id}-email`} type="email" name="email" autoComplete="email" /></label>
      </div>
      <label className="field">Message<textarea id={`${id}-msg`} name="message" rows={5} required /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <div><button type="submit" className="btn btn-navy">{button}</button></div>
    </form>
  );
}

export function PrayerForm() {
  const [text, setText] = useState(null);
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (!f.request.trim()) return setErr('Please write your prayer request before sending.');
    const who = f.name.trim() || 'Anonymous';
    const contact = f.contact.trim() ? ` (${f.contact.trim()})` : '';
    setText(`Prayer request (${f.topic})${f.private ? ' - PRIVATE, pastors only' : ''}\nFrom: ${who}${contact}\n\n${f.request.trim()}`);
  };

  if (text)
    return (
      <Ready
        text={text}
        onAgain={() => setText(null)}
        heading={<h3 style={{ margin: 0, fontFamily: 'var(--head)', fontSize: 24, color: 'var(--dark)' }}>We are praying with you.</h3>}
      />
    );
  return (
    <form className="stack" onSubmit={submit} onInput={() => setErr('')} noValidate>
      <div className="grid-2">
        <label className="field">Your name<input id="pr-name" name="name" autoComplete="name" /></label>
        <label className="field">Phone or email<input id="pr-contact" name="contact" /></label>
      </div>
      <label className="field">
        Prayer for
        <select id="pr-topic" name="topic">
          {['Healing', 'Family', 'Provision', 'Salvation', 'Guidance', 'Other'].map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>
      <label className="field">Your request<textarea id="pr-request" name="request" rows={7} required /></label>
      <label className="chk"><input type="checkbox" id="pr-private" name="private" /> Keep this request private to the pastors</label>
      {err && <p className="err" role="alert">{err}</p>}
      <div><button type="submit" className="btn btn-navy">Prepare prayer request</button></div>
    </form>
  );
}
