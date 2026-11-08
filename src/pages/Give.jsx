import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { api } from '../api.js';
import { useLive } from '../live.jsx';
import { useOverlay } from '../components/Overlay.jsx';
import { Banner, CopyButton, Quote, Tbc } from '../components/ui.jsx';
import { AMOUNTS, BANK, CHURCH, FUNDS, MOMO, fmt } from '../data.js';
import { T, useT } from '../i18n.jsx';

const METHODS = [['mtn', 'MTN MoMo'], ['airtel', 'Airtel Money'], ['bank', 'give.method.bank'], ['intl', 'give.method.intl']];

// The text for key k with each {name} filled in bold, e.g. Giving <b>UGX 10,000</b> to <b>Tithe</b>
function Rich({ k, vars, tag: Tag = 'strong' }) {
  const t = useT();
  const st = t.style(k);
  const parts = t(k).split(/\{(\w+)\}/);
  const out = parts.map((p, i) => (i % 2 ? <Tag key={i}>{vars[p] ?? `{${p}}`}</Tag> : p));
  return st ? <span style={st}>{out}</span> : <>{out}</>;
}

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
  const t = useT();

  const poll = (ref, started = Date.now()) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const g = await api('/give/' + encodeURIComponent(ref));
        if (g.status === 'successful') { setGift(g); setStage('done'); return; }
        if (g.status === 'failed') { setMsg(g.message || t('give.failed')); setStage('failed'); return; }
      } catch { /* keep waiting through a dropped connection */ }
      if (Date.now() - started > 4 * 60 * 1000) {
        setMsg(t('give.noAnswer'));
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
    if (!phoneOk(phone)) { setMsg(t('give.badPhone')); document.getElementById('give-phone')?.focus(); return; }
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
        <strong><T k="give.checkPhone" /></strong>
        <span><Rich k="give.promptSent" tag="b" vars={{ name: momo.name, to: phone ? t('give.promptTo', { phone }) : '', amt }} /></span>
        {gift?.redirect && <span><T k="give.redirectNote" /> <a href={gift.redirect} target="_blank" rel="noopener noreferrer"><T k="give.openAgain" /></a></span>}
        <button type="button" className="btn btn-light" onClick={again}><T k="give.startAgain" /></button>
      </div>
    );
  }
  if (stage === 'done') {
    return (
      <div className="status" tabIndex={-1} ref={(el) => el && el.focus()}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18 }}><Icon name="check" size={22} /> <T k="give.thanks" /></strong>
        <span><Rich k="give.thanksDetail" tag="b" vars={{ amount: fmt(gift?.amount || n), fund: gift?.fund || fundName, ref: gift?.ref }} /></span>
        <div><button type="button" className="btn btn-light" onClick={again}><T k="give.again" /></button></div>
      </div>
    );
  }
  return (
    <>
      <div className="grid-2">
        <label className="field">{t('give.yourNumber', { name: momo.name })}
          <input id="give-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0772 123456" value={phone} onChange={onPhone} />
        </label>
        <label className="field"><T k="give.yourName" />
          <input id="give-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value.slice(0, 120))} />
        </label>
      </div>
      {stage === 'failed' && <p className="err" role="alert">{msg || t('give.failed')} {t('give.tryAgain')}</p>}
      {stage !== 'failed' && msg && <p className="err" role="alert">{msg}</p>}
      <button className="btn btn-gold givebtn" type="button" onClick={start} disabled={stage === 'sending'}>
        <Icon name="phone" size={20} /> {stage === 'sending' ? t('give.sendingPrompt') : n && !err ? t('give.nowAmt', { amt }) : t('give.now')}
      </button>
      <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14, textAlign: 'center' }}>{t('give.pinNote', { name: momo.name })}</p>
    </>
  );
}

function check(n) {
  if (!n) return 'give.errAmount';
  if (n < 500) return 'give.errMin';
  if (n > 5000000) return 'give.errMax';
  return '';
}

export default function Give() {
  const { say } = useOverlay();
  const { payments } = useLive();
  const t = useT();
  const [raw, setRaw] = useState('10000');
  const [method, setMethod] = useState('mtn');
  const [fund, setFund] = useState('tithe');
  const [touched, setTouched] = useState(false);

  const n = parseInt(raw || '0', 10);
  const err = check(n);
  const amt = n ? `UGX ${fmt(n)}` : t('give.yourGift');
  const fundName = t(`give.fund.${fund}`);
  const momo = MOMO[method];

  const onAmount = (e) => {
    setRaw(e.target.value.replace(/[^0-9]/g, '').slice(0, 8));
    setTouched(true);
  };

  return (
    <>
      <Banner photo="children-crowd" eyebrow={<T k="give.eyebrow" />} title={<T k="give.title" />}>
        <p className="crumb" style={{ fontSize: 16, maxWidth: 560 }}><T k="give.lead" /></p>
      </Banner>

      <section className="band" style={{ paddingBlock: '64px 96px' }}>
        <div className="giftbox">
          <div className="stack" style={{ gap: 6 }}>
            <h2 className="h2"><T k="give.make" /></h2>
            <p style={{ margin: 0, color: 'var(--muted)' }}><T k="give.makeHint" /></p>
          </div>

          <fieldset>
            <legend><T k="give.towards" /></legend>
            <div className="opts">
              {FUNDS.map(([id]) => (
                <button key={id} className="opt" type="button" aria-pressed={fund === id} onClick={() => setFund(id)}><T k={`give.fund.${id}`} /></button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend><label htmlFor="give-amount"><T k="give.amount" /></label></legend>
            <div className="amountbox">
              <span aria-hidden="true">UGX</span>
              <input id="give-amount" type="text" inputMode="numeric" autoComplete="off" placeholder={t('give.enterAmount')} value={n ? fmt(n) : ''} onChange={onAmount} aria-describedby="give-err" />
            </div>
            <div className="opts amts">
              {AMOUNTS.map((a) => (
                <button key={a} className="opt" type="button" aria-pressed={n === a} onClick={() => { setRaw(String(a)); setTouched(true); }}>{fmt(a)}</button>
              ))}
            </div>
            {touched && err && <p className="err" id="give-err" role="alert">{t(err)}</p>}
          </fieldset>

          <fieldset>
            <legend><T k="give.how" /></legend>
            <div className="opts">
              {METHODS.map(([id, l]) => (
                <button key={id} className="opt" type="button" aria-pressed={method === id} onClick={() => setMethod(id)}>{l.startsWith('give.') ? t(l) : l}</button>
              ))}
            </div>
          </fieldset>

          {momo && payments === 'push' && (
            <PushPay n={n} err={err} method={method} setMethod={setMethod} fund={fund} fundName={fundName} amt={amt} setTouched={setTouched} />
          )}

          {momo && payments !== 'push' && (
            err ? (
              <button className="btn btn-gold givebtn" type="button" onClick={() => { setTouched(true); document.getElementById('give-amount')?.focus(); }}>
                <Icon name="phone" size={20} /> <T k="give.now" />
              </button>
            ) : (
              <a className="btn btn-gold givebtn" href={'tel:' + dialCode(method, n).replace(/#/g, '%23')} onClick={() => say(t('give.opening', { name: momo.name }))}>
                <Icon name="phone" size={20} /> {t('give.nowAmt', { amt })}
              </a>
            )
          )}

          <div className="summary" aria-live="polite">
            {momo && payments === 'push' ? (
              <>
                <span className="big"><Rich k="give.giving" vars={{ amt, fund: fundName, method: momo.name }} /></span>
                <ol className="steps">
                  <li>{t('give.pushStep1', { name: momo.name })}</li>
                  <li><Rich k="give.pushStep2" tag="b" vars={{ reg: momo.reg || "Potter's House Outreach Ministries" }} /></li>
                  <li>{t('give.pushStep3', { name: momo.name })}</li>
                </ol>
                <span className="copyrow"><T k="give.noPrompt" /> <b className="dial">{dialCode(method, n || 0)}</b> <CopyButton text={dialCode(method, n || 0)} label={t('give.dialCode')}><T k="give.copyCode" /></CopyButton></span>
              </>
            ) : momo ? (
              <>
                <span className="big"><Rich k="give.giving" vars={{ amt, fund: fundName, method: momo.name }} /></span>
                <ol className="steps">
                  <li>{t(momo.num ? 'give.ussdStep1Filled' : 'give.ussdStep1', { name: momo.name })}</li>
                  {momo.num ? (
                    <li><Rich k="give.ussdStep2" tag="b" vars={{ reg: momo.reg || "Potter's House Outreach Ministries" }} /></li>
                  ) : (
                    <li><Rich k="give.ussdStep2Manual" tag="b" vars={{ amt: n ? fmt(n) : t('give.yourAmount') }} /> <Tbc>{t('give.churchNumber', { name: momo.name })}</Tbc></li>
                  )}
                  <li><T k="give.ussdStep3" /></li>
                </ol>
                <span className="copyrow"><T k="give.fromComputer" /> <b className="dial">{dialCode(method, n || 0)}</b> <CopyButton text={dialCode(method, n || 0)} label={t('give.dialCode')}><T k="give.copyCode" /></CopyButton></span>
                <span className="copyrow">WhatsApp <b>{CHURCH.whatsapp}</b> <CopyButton text={CHURCH.whatsapp.replace(/\s/g, '')} label={t('give.waNumber')} /></span>
              </>
            ) : method === 'bank' ? (
              <>
                <span className="big"><Rich k="give.giving" vars={{ amt, fund: fundName, method: t('give.bankTransfer') }} /></span>
                <span><strong><T k="give.bank" /></strong> {BANK.bank || <Tbc><T k="give.bankTbc" /></Tbc>}</span>
                <span><strong><T k="give.accName" /></strong> {BANK.accountName}</span>
                <span><strong><T k="give.accNumber" /></strong> {BANK.accountNumber || <Tbc><T k="give.accTbc" /></Tbc>}</span>
                <span><Rich k="give.bankRef" tag="b" vars={{ fund: fundName, number: CHURCH.whatsapp }} /></span>
              </>
            ) : (
              <>
                <span className="big"><Rich k="give.givingIntl" vars={{ amt, fund: fundName }} /></span>
                <span><T k="give.intlUse" /> <Tbc><T k="give.intlTbc" /></Tbc>.</span>
                <span><strong><T k="give.swift" /></strong> {BANK.swift || <Tbc><T k="give.code" /></Tbc>}</span>
                <span className="copyrow"><T k="give.sponsor" /> <b className="email">{CHURCH.email}</b> <CopyButton text={CHURCH.email} label={t('give.emailAddr')} /></span>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="band" style={{ paddingBlock: '0 96px' }}>
        <div className="wrap funds">
          <div className="fund"><h2><T k="give.fundChurch" /></h2><p><T k="give.fundChurchText" /></p></div>
          <div className="fund"><h2><T k="give.fundOutreach" /></h2><p><T k="give.fundOutreachText" /></p></div>
          <div className="fund"><h2><T k="give.fundStudy" /></h2><p><T k="give.fundStudyText" /></p></div>
        </div>
      </section>

      <Quote photo="celebration" text={<T k="give.quote" />} cite={<T k="give.quoteCite" />} />
    </>
  );
}
