import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { useOverlay } from '../components/Overlay.jsx';
import { Banner, CopyButton, Quote, Tbc } from '../components/ui.jsx';
import { AMOUNTS, BANK, CHURCH, FUNDS, MOMO, fmt } from '../data.js';

const METHODS = [['mtn', 'MTN MoMo'], ['airtel', 'Airtel Money'], ['bank', 'Bank transfer'], ['intl', 'International']];

const localNumber = (num) => num.replace(/\D/g, '').replace(/^256/, '0');
const dialCode = (m, n) => (MOMO[m].num ? MOMO[m].path(localNumber(MOMO[m].num)) + n + '#' : MOMO[m].menu);

function check(n) {
  if (!n) return 'Enter the amount you would like to give.';
  if (n < 500) return 'The smallest gift by Mobile Money is UGX 500.';
  if (n > 5000000) return 'For gifts above UGX 5,000,000 please use bank transfer.';
  return '';
}

export default function Give() {
  const { say } = useOverlay();
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

          {momo && (
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
            {momo ? (
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
