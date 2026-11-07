import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { CHURCH } from '../data.js';
import { useLive, niceDate } from '../live.jsx';
import { T, useT } from '../i18n.jsx';

// Testimonies on the Prayer page: a mixed gallery of written, voice and video testimonies
// (only ones an admin approved), and a form to share one by writing, recording on the phone or choosing a file.

const MAX_MB = 40;
const LIMIT_MIN = { audio: 5, video: 3 };

// ---------- The floating picture or initials for the person ----------
const TONES = ['#A03207', '#1B2A47', '#7A5612', '#2C4A20', '#5B3A73', '#245A63'];
const initials = (name) => (name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '✝';
const tone = (name) => TONES[[...(name || 'PHOMI')].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];

function Avatar({ name, photo, i = 0 }) {
  return (
    <span className="tst-av" style={{ '--tone': tone(name), animationDelay: `${(i % 5) * -1.3}s` }} aria-hidden="true">
      {photo ? <img src={photo} alt="" loading="lazy" /> : <b>{initials(name)}</b>}
    </span>
  );
}

function Who({ item }) {
  const t = useT();
  return (
    <p className="tst-who">
      <strong>{item.name || t('testi.anon')}</strong>
      {item.place && <span>{item.place}</span>}
    </p>
  );
}

const clock = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

// A voice note with a big play button and a bar that moves while it plays
function VoicePlayer({ src, name }) {
  const t = useT();
  const a = useRef();
  const [on, setOn] = useState(false);
  const [time, setTime] = useState(0);
  const [len, setLen] = useState(NaN);
  useEffect(() => {
    const el = a.current;
    const others = () => { if (el && !el.paused) el.pause(); };
    document.addEventListener('tst-play', others);
    return () => document.removeEventListener('tst-play', others);
  }, []);
  const toggle = () => {
    const el = a.current;
    if (el.paused) {
      document.dispatchEvent(new Event('tst-play'));
      el.play().catch(() => {});
    } else el.pause();
  };
  return (
    <div className={'tst-voice' + (on ? ' on' : '')}>
      <button type="button" className="tst-playbtn" onClick={toggle} aria-label={on ? t('testi.pause') : t('testi.play', { name: name || t('testi.anon') })}>
        <Icon name={on ? 'pause' : 'play'} size={22} />
      </button>
      <div className="tst-wave" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => <i key={i} style={{ '--h': `${30 + ((i * 37) % 70)}%`, animationDelay: `${i * -0.09}s` }} />)}
        <span className="tst-prog" style={{ width: `${len ? (time / len) * 100 : 0}%` }} />
      </div>
      <input
        type="range" className="tst-seek" min={0} max={Number.isFinite(len) ? len : 0} step="0.1" value={time}
        aria-label={t('testi.voiceLabel')}
        onChange={(e) => { a.current.currentTime = Number(e.target.value); setTime(Number(e.target.value)); }}
      />
      <span className="tst-time">{clock(on || time ? time : len)}</span>
      <audio
        ref={a} src={src} preload="metadata"
        onPlay={() => setOn(true)} onPause={() => setOn(false)} onEnded={() => { setOn(false); setTime(0); }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setLen(e.currentTarget.duration)}
        onDurationChange={(e) => setLen(e.currentTarget.duration)}
      />
    </div>
  );
}

// Picks a size for each card so the gallery has a varied, magazine-like rhythm
function sizeOf(item, i) {
  if (item.kind === 'video') return 'tall';
  if (item.kind === 'audio') return i % 3 === 0 ? 'wide' : 'mid';
  const n = (item.body || '').length;
  if (n > 420) return 'big';
  if (n > 160) return i % 2 ? 'wide' : 'mid';
  return 'small';
}

// Videos only start loading when they come near the screen, so the page opens fast on mobile data
function LazyVideo({ src }) {
  const ref = useRef();
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return setNear(true);
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <video ref={ref} src={near ? `${src}#t=0.1` : undefined} controls playsInline preload={near ? 'metadata' : 'none'} onPlay={() => document.dispatchEvent(new Event('tst-play'))} />;
}

function Card({ item, i, onRead }) {
  const t = useT();
  const size = sizeOf(item, i);
  const long = (item.body || '').length > (size === 'big' ? 520 : size === 'small' ? 170 : 260);
  const shade = item.kind ? '' : ['cream', 'clay', 'gold', 'cream', 'navy'][i % 5];
  return (
    <article className={`tst-card tst-${size} ${item.kind ? 'tst-' + item.kind : 'tst-text ' + shade}`} data-kind={item.kind || 'text'}>
      <Avatar name={item.name} photo={item.photo} i={i} />
      {item.kind === 'video' && (
        <div className="tst-vid"><LazyVideo src={item.media} /></div>
      )}
      <div className="tst-bd">
        {item.kind && <span className="tst-tag"><Icon name={item.kind === 'video' ? 'video' : 'mic'} size={14} /> {t(item.kind === 'video' ? 'testi.videoLabel' : 'testi.voiceLabel')}</span>}
        {item.title && <h3>{item.title}</h3>}
        {item.kind === 'audio' && <VoicePlayer src={item.media} name={item.name} />}
        {item.body && <blockquote className={long ? 'clamp' : ''}>{item.body}</blockquote>}
        {long && <button type="button" className="tst-more" onClick={() => onRead(item)}><T k="testi.readAll" /></button>}
        <Who item={item} />
        {item.created_at && <span className="tst-date">{niceDate(item.created_at)}</span>}
      </div>
    </article>
  );
}

function Reader({ item, onClose }) {
  const t = useT();
  const ref = useRef();
  useEffect(() => {
    const d = ref.current;
    if (item && d && !d.open) d.showModal?.();
  }, [item]);
  if (!item) return null;
  return (
    <dialog ref={ref} className="tst-dialog" onClose={onClose} onClick={(e) => e.target === ref.current && ref.current.close()} aria-label={item.title || item.name || t('testi.title')}>
      <div className="tst-dialog-in">
        <Avatar name={item.name} photo={item.photo} />
        {item.title && <h3>{item.title}</h3>}
        <blockquote>{item.body}</blockquote>
        <Who item={item} />
        <button type="button" className="btn btn-navy" onClick={() => ref.current.close()}><T k="testi.close" /></button>
      </div>
    </dialog>
  );
}

export function TestimonyGallery() {
  const t = useT();
  const { testimonies } = useLive();
  const [show, setShow] = useState('all');
  const [reading, setReading] = useState(null);
  const items = useMemo(() => (testimonies || []).filter((x) => x.body || x.media), [testimonies]);
  const count = (k) => items.filter((x) => (x.kind || 'text') === k).length;
  const kinds = [['all', 'testi.all', items.length], ['text', 'testi.written', count('text')], ['audio', 'testi.voice', count('audio')], ['video', 'testi.videos', count('video')]].filter((k) => k[2] > 0);
  const list = show === 'all' ? items : items.filter((x) => (x.kind || 'text') === show);
  return (
    <div className="tst-gallery">
      {items.length >= 4 && kinds.length > 2 && (
        <div className="chips" role="group" aria-label={t('testi.title')}>
          {kinds.map(([k, label, n]) => (
            <button key={k} type="button" className="tab" aria-pressed={show === k} onClick={() => setShow(k)}>{t(label)} <small>{n}</small></button>
          ))}
        </div>
      )}
      {list.length ? (
        <div className="tst-grid">
          {list.map((x, i) => <Card key={x.id} item={x} i={i} onRead={setReading} />)}
        </div>
      ) : (
        <div className="tst-empty">
          <span className="tst-empty-icons" aria-hidden="true"><Icon name="edit" size={22} /><Icon name="mic" size={22} /><Icon name="video" size={22} /></span>
          <p><T k="testi.empty" /></p>
          <a className="btn btn-gold" href="#share-testimony"><T k="testi.jump" /></a>
        </div>
      )}
      <Reader item={reading} onClose={() => setReading(null)} />
    </div>
  );
}

// ---------- Recording on the phone ----------
const pickType = (kind) => {
  const list = kind === 'audio'
    ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
    : ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  try {
    return list.find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || '';
  } catch {
    return '';
  }
};
const extOf = (type) => (type.includes('mp4') ? (type.startsWith('audio') ? 'm4a' : 'mp4') : type.includes('ogg') ? 'ogg' : 'webm');

function Recorder({ kind, clip, onClip }) {
  const t = useT();
  const what = t(kind === 'audio' ? 'testi.mic' : 'testi.camera');
  const word = t(kind === 'audio' ? 'testi.voiceWord' : 'testi.videoWord');
  const [state, setState] = useState('idle'); // idle | asking | rec | error
  const [err, setErr] = useState('');
  const [secs, setSecs] = useState(0);
  const [level, setLevel] = useState(0);
  const live = useRef();
  const rec = useRef(null);
  const stream = useRef(null);
  const timers = useRef([]);
  const can = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && !!window.MediaRecorder;

  const cleanup = () => {
    timers.current.forEach((x) => (typeof x === 'function' ? x() : clearInterval(x)));
    timers.current = [];
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
    setLevel(0);
  };
  useEffect(() => () => { try { rec.current?.state === 'recording' && rec.current.stop(); } catch { /* already stopped */ } cleanup(); }, []);

  const start = async () => {
    setErr('');
    setState('asking');
    try {
      const s = await navigator.mediaDevices.getUserMedia(kind === 'audio'
        ? { audio: { echoCancellation: true, noiseSuppression: true } }
        : { audio: true, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } } });
      stream.current = s;
      if (kind === 'video' && live.current) {
        live.current.srcObject = s;
        live.current.play().catch(() => {});
      }
      const type = pickType(kind);
      const opts = { audioBitsPerSecond: 40000, ...(kind === 'video' ? { videoBitsPerSecond: 600000 } : {}), ...(type ? { mimeType: type } : {}) };
      let r;
      try { r = new MediaRecorder(s, opts); } catch { r = new MediaRecorder(s); }
      const parts = [];
      r.ondataavailable = (e) => e.data && e.data.size && parts.push(e.data);
      r.onstop = () => {
        const mime = (r.mimeType || type || (kind === 'audio' ? 'audio/webm' : 'video/webm')).split(';')[0];
        const blob = new Blob(parts, { type: mime });
        cleanup();
        setState('idle');
        if (blob.size) onClip({ blob, url: URL.createObjectURL(blob), name: `${kind === 'audio' ? 'voice' : 'video'}-testimony.${extOf(mime)}`, recorded: true });
      };
      rec.current = r;
      r.start(1000);
      setSecs(0);
      setState('rec');
      const began = Date.now();
      timers.current.push(setInterval(() => {
        const n = Math.floor((Date.now() - began) / 1000);
        setSecs(n);
        if (n >= LIMIT_MIN[kind] * 60 && r.state === 'recording') r.stop();
      }, 250));
      // A small sound meter so people can see the microphone is hearing them
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        const ac = new AC();
        const an = ac.createAnalyser();
        an.fftSize = 256;
        ac.createMediaStreamSource(s).connect(an);
        const buf = new Uint8Array(an.frequencyBinCount);
        const iv = setInterval(() => {
          an.getByteTimeDomainData(buf);
          let m = 0;
          for (const v of buf) m = Math.max(m, Math.abs(v - 128));
          setLevel(Math.min(1, m / 64));
        }, 90);
        timers.current.push(iv, () => ac.close().catch(() => {}));
      } catch { /* meter is optional */ }
    } catch {
      cleanup();
      setState('error');
      setErr(t('testi.recDenied', { what }));
    }
  };
  const stop = () => { try { rec.current?.stop(); } catch { cleanup(); setState('idle'); } };

  const choose = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) return setErr(t('testi.tooBig', { mb: MAX_MB }));
    setErr('');
    onClip({ blob: f, url: URL.createObjectURL(f), name: f.name, recorded: false });
  };
  const drop = () => { if (clip) URL.revokeObjectURL(clip.url); onClip(null); };

  return (
    <div className={`tst-rec tst-rec-${kind}`} data-state={clip ? 'done' : state}>
      {kind === 'video' && !clip && <video ref={live} className="tst-live" muted playsInline hidden={state !== 'rec' && state !== 'asking'} />}
      {clip ? (
        <>
          <p className="tst-ready"><Icon name="check" size={18} /> <T k="testi.recReady" /></p>
          {kind === 'audio' ? <audio src={clip.url} controls preload="metadata" /> : <video src={clip.url} controls playsInline preload="metadata" />}
          <div className="btn-row">
            {can && <button type="button" className="btn btn-light" onClick={() => { drop(); start(); }}><Icon name="refresh" size={16} /> <T k="testi.recAgain" /></button>}
            <button type="button" className="btn btn-light" onClick={drop}><Icon name="trash" size={16} /> <T k="testi.recRemove" /></button>
          </div>
        </>
      ) : state === 'rec' ? (
        <div className="tst-recbar">
          <span className="tst-dot" aria-hidden="true" />
          <span role="timer" aria-live="off"><T k="testi.recording" /> {clock(secs)} / {LIMIT_MIN[kind]}:00</span>
          <span className="tst-meter" aria-hidden="true"><i style={{ transform: `scaleX(${0.08 + level * 0.92})` }} /></span>
          <button type="button" className="btn btn-gold" onClick={stop}><Icon name="pause" size={16} /> <T k="testi.recStop" /></button>
        </div>
      ) : (
        <>
          {can ? (
            <>
              <button type="button" className="tst-bigrec" onClick={start} disabled={state === 'asking'}>
                <span className="tst-bigdot"><Icon name={kind === 'audio' ? 'mic' : 'video'} size={26} /></span>
                <span><b><T k="testi.recStart" /></b><small><T k="testi.recLimit" vars={{ min: LIMIT_MIN[kind] }} /></small></span>
              </button>
              <p className="tst-hint"><T k="testi.recAsk" vars={{ what }} /> <T k="testi.tips" /></p>
            </>
          ) : (
            <p className="tst-hint"><T k="testi.recUnsupported" /></p>
          )}
        </>
      )}
      {!clip && state !== 'rec' && (
        <label className="tst-choose">
          <Icon name="upload" size={16} /> <T k="testi.choose" vars={{ what: word }} />
          <input type="file" accept={kind === 'audio' ? 'audio/*' : 'video/*'} onChange={choose} hidden />
        </label>
      )}
      {err && <p className="err" role="alert">{err}</p>}
    </div>
  );
}

// Sends with progress, since voice notes and videos can take a while on a slow connection
function upload(form, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', '/api/testimony');
    x.setRequestHeader('X-PHOMI', '1');
    x.setRequestHeader('Accept', 'application/json');
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    x.onload = () => {
      let data = {};
      try { data = JSON.parse(x.responseText); } catch { /* not JSON */ }
      if (x.status >= 200 && x.status < 300 && data.ok) resolve(data);
      else reject(Object.assign(new Error(data.error || ''), { status: x.status, known: !!data.error }));
    };
    x.onerror = () => reject(Object.assign(new Error(''), { status: 0 }));
    x.send(form);
  });
}

export function TestimonyForm() {
  const t = useT();
  const [mode, setMode] = useState('text');
  const [clips, setClips] = useState({ audio: null, video: null });
  const [photo, setPhoto] = useState(null);
  const [pct, setPct] = useState(-1);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const formRef = useRef();
  const clip = mode === 'text' ? null : clips[mode];

  const pickPhoto = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto({ file: f, url: URL.createObjectURL(f) });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const fd = new FormData(e.currentTarget);
    const body = String(fd.get('body') || '').trim();
    if (mode === 'text' && !body) return setErr(t('testi.needBody'));
    if (mode !== 'text' && !clip) return setErr(t('testi.needMedia', { what: t(mode === 'audio' ? 'testi.voiceWord' : 'testi.videoWord') }));
    if (!fd.get('consent')) return setErr(t('testi.needConsent'));
    fd.set('lang', t.lang);
    if (clip) fd.set('file', clip.blob, clip.name);
    if (photo) fd.set('photo', photo.file, photo.file.name || 'me.jpg');
    setPct(0);
    try {
      await upload(fd, setPct);
      setDone(true);
      formRef.current?.reset();
      setClips({ audio: null, video: null });
      setPhoto(null);
    } catch (x) {
      setErr(x.known ? x.message : x.status === 413 ? t('testi.tooBig', { mb: MAX_MB }) : t('testi.noServer', { number: CHURCH.whatsapp }));
    } finally {
      setPct(-1);
    }
  };

  if (done)
    return (
      <div className="status tst-done" tabIndex={-1} ref={(el) => el && el.focus()}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="heart" size={20} /> <T k="testi.thanks" /></strong>
        <span><T k="testi.thanksMore" /></span>
        <div><button type="button" className="btn btn-light" onClick={() => setDone(false)}><T k="testi.another" /></button></div>
      </div>
    );

  const MODES = [['text', 'testi.modeWrite', 'edit'], ['audio', 'testi.modeVoice', 'mic'], ['video', 'testi.modeVideo', 'video']];
  return (
    <form className="stack tst-form" ref={formRef} onSubmit={submit} onInput={() => setErr('')} noValidate>
      <fieldset className="tst-modes">
        <legend><T k="testi.how" /></legend>
        {MODES.map(([m, k, icon]) => (
          <button key={m} type="button" className="tst-mode" aria-pressed={mode === m} onClick={() => { setMode(m); setErr(''); }}>
            <Icon name={icon} size={22} /> <span>{t(k)}</span>
          </button>
        ))}
      </fieldset>
      {mode !== 'text' && <Recorder key={mode} kind={mode} clip={clips[mode]} onClip={(c) => setClips((s) => ({ ...s, [mode]: c }))} />}
      <label className="field"><T k="testi.headline" /><input name="title" maxLength={200} placeholder={t('testi.headlineHint')} /></label>
      <label className="field">{t(mode === 'text' ? 'testi.body' : 'testi.bodyOptional')}<textarea name="body" rows={mode === 'text' ? 6 : 3} maxLength={5000} required={mode === 'text'} /></label>
      <div className="grid-2">
        <label className="field"><T k="form.yourName" /><input name="name" autoComplete="name" maxLength={120} /></label>
        <label className="field"><T k="testi.place" /><input name="place" maxLength={120} /></label>
      </div>
      <label className="field"><T k="testi.contactPrivate" /><input name="contact" maxLength={190} autoComplete="tel" /></label>
      <div className="tst-photo">
        <span className="tst-av still" style={{ '--tone': 'var(--dark)' }} aria-hidden="true">{photo ? <img src={photo.url} alt="" /> : <Icon name="users" size={24} />}</span>
        <div>
          <span className="tst-photo-l"><T k="testi.photo" /></span>
          <div className="btn-row">
            <label className="btn btn-light tst-small">
              <Icon name="image" size={16} /> {t(photo ? 'testi.photoChange' : 'testi.photoAdd')}
              <input type="file" accept="image/*" onChange={pickPhoto} hidden />
            </label>
            {photo && <button type="button" className="btn btn-light tst-small" onClick={() => { URL.revokeObjectURL(photo.url); setPhoto(null); }}><T k="testi.photoRemove" /></button>}
          </div>
          <small className="tst-hint"><T k="testi.photoHint" /></small>
        </div>
      </div>
      <label className="chk"><input type="checkbox" name="consent" value="1" /> <T k="testi.consent" /></label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }} />
      {err && <p className="err" role="alert">{err}</p>}
      {pct >= 0 && <div className="tst-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>}
      <div><button type="submit" className="btn btn-gold" disabled={pct >= 0}>{pct >= 0 ? t('testi.sending', { pct }) : t('testi.send')}</button></div>
    </form>
  );
}
