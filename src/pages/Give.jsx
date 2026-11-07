import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { api } from '../api.js';
import { useLive } from '../live.jsx';
import { useOverlay } from '../components/Overlay.jsx';
import { Banner, CopyButton, Quote, Tbc } from '../components/ui.jsx';
import { AMOUNTS, BANK, CHURCH, FUNDS, MOMO, fmt } from '../data.js';

const METHODS = [['mtn', 'MTN MoMo'], ['airtel', 'Airtel Money'], ['bank', 'Bank transfer'], ['intl', 'International']];

const localNumber = (num) => num.replace(/\D/g, '').replace(/^256/, '0');
const dialCode = (m, n) => (MOMO[m].num ? MOMO[m].path(localNumber(MOMO[m].num)) + n + '#' : MOMO[m].menu);

// 0772 123456 → MTN, 0752 123456 → Airtel
function networkOf(phone) {
  const d = phone.replace(/\D/g, '').replace(/^256/, '0').replace(/^7/, '07');
  if (/^07[6-9]/.test(d)) return 'mtn';
  if (/^07[045]/.test(d)) return 'airtel';
  return null;
}
const phoneOk = (phone) => /^0?7\d{8}$/.test(phone.replace(/\D/g, '').replace(/^256/, ''));

// Sends the PIN prompt to the giver's phone and waits for the network to confirm.
function PushPay({ n, err, method, setMethod, fund, fundName, amt, setTouched }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [stage, setStage] = useState('form'); // form | sending | waiting | done | failed
  const [msg, setMsg] = useState('');
  const [gift, setGift] = useState(null);
  const [params, setParams] = useSearchParams();
  const timer = useRef();
  const momo = MOMO[method];

  const poll = (ref, started = Date.now()) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const g = await api('/give/' + encodeURIComponent(ref));
        if (g.status === 'successful') { setGift(g); setStage('done'); return; }
        if (g.status === 'failed') { setMsg(g.message || 'The payment did not go through.'); setStage('failed'); return; }
      } catch { /* keep waiting through a dropped connection */ }
      if (Date.now() - started > 4 * 60 * 1000) {
        setMsg('We did not hear back from the network. If money left your account, send us the transaction ID on WhatsApp.');
        setStage('failed');
        return;
      }
      poll(ref, started);
    }, 4000);
  };

  useEffect(() => {
    const ref = params.get('ref');
    if (ref) { setStage('waiting'); poll(ref); }
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPhone = (e) => {
    const v = e.target.value.replace(/[^\d+ ]/g, '').slice(0, 16);
    setPhone(v);
    const net = networkOf(v);
    if (net && net !== method) setMethod(net);
  };

  const start = async () => {
    setTouched(true);
    if (err) { document.getElementById('give-amount')?.focus(); return; }
    if (!phoneOk(phone)) { setMsg('Enter your Mobile Money number, for example 0772 123456.'); document.getElementById('give-phone')?.focus(); return; }
    setMsg('');
    setStage('sending');
    try {
      const r = await api('/give', { method: 'POST', body: { amount: n, phone, network: method === 'mtn' ? 'MTN' : 'AIRTEL', fund, name } });
      if (r.redirect) window.open(r.redirect, '_blank', 'noopener');
      setGift({ ref: r.ref, redirect: r.redirect });
      setParams({ ref: r.ref }, { replace: true });
      setStage('waiting');
      poll(r.ref);
    } catch (x) {
      setMsg(x.message);
      setStage('form');
    }
  };

  const again = () => { clearTimeout(timer.current); setParams({}, { replace: true }); setStage('form'); setGift(null); setMsg(''); };

  if (stage === 'waiting') {
    return (
      <div className="paywait" role="status" aria-live="polite">
        <span className="pulse" aria-hidden="true"><Icon name="phone" size={28} /></span>
        <strong>Check your phone</strong>
        <span>An {momo.name} prompt has been sent{phone ? ` to ${phone}` : ''}. Enter your PIN to give <b>{amt}</b>. This page updates by itself.</span>
        {gift?.redirect && <span>If a confirmation page opened, finish there too. <a href={gift.redirect} target="_blank" rel="noopener noreferrer">Open it again</a></span>}
        <button type="button" className="btn btn-light" onClick={again}>Start again</button>
      </div>
    );
  }
  if (stage === 'done') {
    return (
      <div className="status" tabIndex={-1} ref={(el) => el && el.focus()}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18 }}><Icon name="check" size={22} /> Thank you. Your gift has been received.</strong>
        <span>UGX {fmt(gift?.amount || n)} for {gift?.fund || fundName}. Reference <b>{gift?.ref}</b>. God bless you.</span>
        <div><button type="button" className="btn btn-light" onClick={again}>Give again</button></div>
      </div>
    );
  }
  return (
    <>
      <div className="grid-2">
        <label className="field">Your {momo.name} number
          <input id="give-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0772 123456" value={phone} onChange={onPhone} />
        </label>
        <label className="field">Your name (optional)
          <input id="give-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value.slice(0, 120))} />
        </label>
      </div>
      {stage === 'failed' && <p className="err" role="alert">{msg || 'The payment did not go through.'} You can try again.</p>}
      {stage !== 'failed' && msg && <p className="err" role="alert">{msg}</p>}
      <button className="btn btn-gold givebtn" type="button" onClick={start} disabled={stage === 'sending'}>
        <Icon name="phone" size={20} /> {stage === 'sending' ? 'Sending prompt…' : n && !err ? `Give ${amt} now` : 'Give now'}
      </button>
      <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14, textAlign: 'center' }}>We send a {momo.name} prompt to your phone. You confirm with your PIN. Nobody at the church sees your PIN.</p>
    </>
  );
}

function check(n) {
  if (!n) return 'Enter the amount you would like to give.';
  if (n < 500) return 'The smallest gift by Mobile Money is UGX 500.';
  if (n > 5000000) return 'For gifts above UGX 5,000,000 please use bank transfer.';
  return '';
}

export default function Give() {
  const { say } = useOverlay();
  const { payments } = useLive();
  const [raw, setRaw] = useState('10000');
  const [method, setMethod] = useState('mtn');
  const [fund, setFund] = useState('tithe');
  const [touched, setTouched] = useState(false);

  const n = parseInt(raw || '0', 10);
  const err = check(n);
  const amt = n ? `UGX ${fmt(n)}` : 'your gift';
  const fundName = FUNDS.find((f) => f[0] === fund)[1];
  const momo = MOMO[method];

  const onAmount = (e) => {
    setRaw(e.target.value.replace(/[^0-9]/g, '').slice(0, 8));
    setTouched(true);
  };

  return (
    <>
      <Banner photo="children-crowd" eyebrow="Partner with us" title="Give">
        <p className="crumb" style={{ fontSize: 16, maxWidth: 560 }}>Your gift helps us preach the gospel and care for the vulnerable in Butebo District and beyond.</p>
      </Banner>

      <section className="band" style={{ paddingBlock: '64px 96px' }}>
        <div className="giftbox">
          <div className="stack" style={{ gap: 6 }}>
            <h2 className="h2">Make a gift</h2>
            <p style={{ margin: 0, color: 'var(--muted)' }}>Type any amount or pick one below, then tap Give now on your phone.</p>
          </div>

          <fieldset>
            <legend>Give towards</legend>
            <div className="opts">
              {FUNDS.map(([id, l]) => (
                <button key={id} className="opt" type="button" aria-pressed={fund === id} onClick={() => setFund(id)}>{l}</button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend><label htmlFor="give-amount">Amount (UGX)</label></legend>
            <div className="amountbox">
              <span aria-hidden="true">UGX</span>
              <input id="give-amount" type="text" inputMode="numeric" autoComplete="off" placeholder="Enter amount" value={n ? fmt(n) : ''} onChange={onAmount} aria-describedby="give-err" />
            </div>
            <div className="opts amts">
              {AMOUNTS.map((a) => (
                <button key={a} className="opt" type="button" aria-pressed={n === a} onClick={() => { setRaw(String(a)); setTouched(true); }}>{fmt(a)}</button>
              ))}
            </div>
            {touched && err && <p className="err" id="give-err" role="alert">{err}</p>}
          </fieldset>

          <fieldset>
            <legend>How to give</legend>
            <div className="opts">
              {METHODS.map(([id, l]) => (
                <button key={id} className="opt" type="button" aria-pressed={method === id} onClick={() => setMethod(id)}>{l}</button>
              ))}
            </div>
          </fieldset>

          {momo && payments === 'push' && (
            <PushPay n={n} err={err} method={method} setMethod={setMethod} fund={fund} fundName={fundName} amt={amt} setTouched={setTouched} />
          )}

          {momo && payments !== 'push' && (
            err ? (
              <button className="btn btn-gold givebtn" type="button" onClick={() => { setTouched(true); document.getElementById('give-amount')?.focus(); }}>
                <Icon name="phone" size={20} /> Give now
              </button>
            ) : (
              <a className="btn btn-gold givebtn" href={'tel:' + dialCode(method, n).replace(/#/g, '%23')} onClick={() => say(`Opening ${momo.name}…`)}>
                <Icon name="phone" size={20} /> Give {amt} now
              </a>
            )
          )}

          <div className="summary" aria-live="polite">
            {momo && payments === 'push' ? (
              <>
                <span className="big">Giving <strong>{amt}</strong> to <strong>{fundName}</strong> by <strong>{momo.name}</strong></span>
                <ol className="steps">
                  <li>Type your {momo.name} number and tap <b>Give now</b>.</li>
                  <li>A prompt appears on your phone. Check the name shows <b>{momo.reg || "Potter's House Outreach Ministries"}</b>, then enter your PIN.</li>
                  <li>This page shows <b>Thank you</b> when the gift arrives. You also get an SMS from {momo.name}.</li>
                </ol>
                <span className="copyrow">No prompt? On your phone dial <b className="dial">{dialCode(method, n || 0)}</b> <CopyButton text={dialCode(method, n || 0)} label="the dial code">Copy code</CopyButton></span>
              </>
            ) : momo ? (
              <>
                <span className="big">Giving <strong>{amt}</strong> to <strong>{fundName}</strong> by <strong>{momo.name}</strong></span>
                <ol className="steps">
                  <li>Tap <b>Give now</b> on your phone. Your {momo.name} menu opens{momo.num ? ' with the church number and amount filled in' : ''}.</li>
                  {momo.num ? (
                    <li>Check the name shows <b>{momo.reg || "Potter's House Outreach Ministries"}</b>, then enter your PIN.</li>
                  ) : (
                    <li>Choose <b>Send Money</b>, enter the church number <Tbc>{momo.name} number</Tbc> and <b>{n ? fmt(n) : 'your amount'}</b>, then your PIN.</li>
                  )}
                  <li>Send the transaction ID on WhatsApp so we can thank you and send a receipt.</li>
                </ol>
                <span className="copyrow">Giving from a computer? On your phone dial <b className="dial">{dialCode(method, n || 0)}</b> <CopyButton text={dialCode(method, n || 0)} label="the dial code">Copy code</CopyButton></span>
                <span className="copyrow">WhatsApp <b>{CHURCH.whatsapp}</b> <CopyButton text={CHURCH.whatsapp.replace(/\s/g, '')} label="WhatsApp number" /></span>
              </>
            ) : method === 'bank' ? (
              <>
                <span className="big">Giving <strong>{amt}</strong> to <strong>{fundName}</strong> by <strong>bank transfer</strong></span>
                <span><strong>Bank:</strong> {BANK.bank || <Tbc>Bank name, branch</Tbc>}</span>
                <span><strong>Account name:</strong> {BANK.accountName}</span>
                <span><strong>Account number:</strong> {BANK.accountNumber || <Tbc>Account number</Tbc>}</span>
                <span>Use <b>{fundName}</b> as the reference, then send the slip on WhatsApp ({CHURCH.whatsapp}).</span>
              </>
            ) : (
              <>
                <span className="big">Giving <strong>{amt}</strong> to <strong>{fundName}</strong> from outside Uganda</span>
                <span>Use <Tbc>online giving link / SWIFT details / partner organisation</Tbc>.</span>
                <span><strong>SWIFT / BIC:</strong> {BANK.swift || <Tbc>Code</Tbc>}</span>
                <span className="copyrow">To sponsor a child's schooling, email <b className="email">{CHURCH.email}</b> <CopyButton text={CHURCH.email} label="email address" /></span>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="band" style={{ paddingBlock: '0 96px' }}>
        <div className="wrap funds">
          <div className="fund"><h2>Church &amp; Worship</h2><p>Tithes and offerings that sustain Sunday services, prayer and the life of the church.</p></div>
          <div className="fund"><h2>Outreach &amp; Care</h2><p>Education, feeding, healthcare and accommodation for vulnerable people.</p></div>
          <div className="fund"><h2>Bible Study</h2><p>Bible study at PHOMI is free for everyone. Your gifts provide Bibles, materials and teaching so more people can study God's word.</p></div>
        </div>
      </section>

      <Quote
        photo="celebration"
        text="Every man according as he purposeth in his heart, so let him give; not grudgingly, or of necessity: for God loveth a cheerful giver."
        cite="2 Corinthians 9:7"
      />
    </>
  );
}
