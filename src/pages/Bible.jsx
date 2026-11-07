import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Banner } from '../components/ui.jsx';
import { SendTo, Subscribe, VerseCard } from '../components/Verse.jsx';
import { useOverlay } from '../components/Overlay.jsx';
import { api } from '../api.js';
import { BOOKS, BOOKS_LG, TRANSLATIONS } from '../bible-books.js';
import { useLive } from '../live.jsx';
import { setHead } from '../head.js';
import { T, useT } from '../i18n.jsx';

const trTag = (k) => (k === 'lug' ? 'Luganda' : String(k || 'kjv').toUpperCase());

const KEY = 'phomi-bible';
const remember = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode */ } };

export default function Bible() {
  const { verse: verseEn, verse_lg: verseLg } = useLive();
  const t = useT();
  const lg = t.lang === 'lg';
  const verse = lg && verseLg?.day?.text ? verseLg : verseEn;
  const { copy } = useOverlay();
  const [params, setParams] = useSearchParams();
  const last = useMemo(remember, []);
  // Luganda readers start in the Luganda Bible; a link or their last choice wins
  const [tr, setTr] = useState(params.get('tr') || last.tr || (lg ? 'lug' : ''));
  const [book, setBook] = useState(Number(last.book) || 43);
  const [ch, setCh] = useState(Number(last.ch) || 1);
  const [data, setData] = useState(null);
  const [mark, setMark] = useState([]);
  const [picked, setPicked] = useState(null);
  const [q, setQ] = useState(params.get('ref') || params.get('q') || '');
  const [found, setFound] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Open a reference or run a word search
  const go = async (text, trans = tr) => {
    const s = text.trim();
    if (!s) return;
    setBusy(true);
    setErr('');
    try {
      const r = await api(`/bible/search?q=${encodeURIComponent(s)}&tr=${trans}`);
      if (r.chapter) {
        setFound(null);
        setData(r.chapter);
        setBook(r.chapter.book);
        setCh(r.chapter.chapter);
        setTr(r.chapter.translation);
        setMark(r.highlight);
        setPicked(r.highlight.length ? r.passage : null);
        setTimeout(() => document.getElementById(`v${r.highlight[0] || 1}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 80);
      } else {
        setFound(r);
      }
    } catch (x) {
      setErr(x.status === 404 ? t('common.offlineBible') : x.message);
    } finally {
      setBusy(false);
    }
  };

  // First load: a link like /bible?ref=John+3:16, or the last chapter this reader had open
  useEffect(() => {
    if (params.get('ref') || params.get('q')) go(params.get('ref') || params.get('q'));
    else load(book, ch, tr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async (b, c, t = tr) => {
    setBusy(true);
    setErr('');
    setFound(null);
    try {
      const r = await api(`/bible/${t || 'x'}/${b}/${c}`);
      setData(r);
      setBook(b);
      setCh(c);
      setTr(r.translation);
      setMark([]);
      setPicked(null);
      save({ book: b, ch: c, tr: r.translation });
    } catch (x) {
      setErr(x.status === 404 && !x.data?.error ? t('common.offlineBible') : x.message);
    } finally {
      setBusy(false);
    }
  };

  // Switching the site language moves the reader to the Bible in that language, at the same chapter
  const firstLang = useRef(true);
  useEffect(() => {
    if (firstLang.current) { firstLang.current = false; return; }
    if (lg && tr !== 'lug') load(book, ch, 'lug');
    if (!lg && tr === 'lug') load(book, ch, 'kjv');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lg]);

  const step = (d) => {
    let b = book;
    let c = ch + d;
    if (c < 1) { b = Math.max(1, b - 1); c = BOOKS[b - 1][1]; }
    if (c > BOOKS[b - 1][1]) { b = Math.min(66, b + 1); c = 1; }
    load(b, c);
    window.scrollTo({ top: document.getElementById('reader')?.offsetTop - 80, behavior: 'smooth' });
  };

  const bookName = (d) => (d.translation === 'lug' && d.name_lg ? d.name_lg : d.name === 'Psalms' ? 'Psalm' : d.name);
  const pick = (v) => {
    const name = bookName(data);
    const ref = data.chapters === 1 ? `${name} ${v.v}` : `${name} ${data.chapter}:${v.v}`;
    setMark([v.v]);
    setPicked({ ref, text: v.t, translation: data.translation, verses: [v] });
    setParams({ ref, tr: data.translation }, { replace: true });
  };

  const chapterName = data ? `${bookName(data)} ${data.chapter}` : '';
  const share = picked ? `“${picked.text}”\n${picked.ref} (${trTag(picked.translation)})` : '';
  const link = picked ? `${window.location.origin}/bible?ref=${encodeURIComponent(picked.ref)}${picked.translation !== 'kjv' ? `&tr=${picked.translation}` : ''}` : '';
  useEffect(() => {
    const ref = picked?.ref || chapterName;
    setHead({
      path: '/bible',
      title: ref ? `${ref} (${trTag(picked?.translation || data?.translation)}) | ${t('bible.title')} | PHOMI` : undefined,
      description: picked ? `“${picked.text.length > 130 ? picked.text.slice(0, 130) + '…' : picked.text}” ${picked.ref}. Read the whole Bible free at Potter's House.` : undefined,
    });
  }, [picked, chapterName, data, t]);
  return (
    <>
      <Banner photo="class-room" eyebrow={<T k="bible.eyebrow" />} title={<T k="bible.title" />} crumb={<T k="bible.crumb" />} />
      {verse?.day?.text && (
        <section className="sec band tint" style={{ paddingBlock: 56 }}>
          <div className="wrap verse-pair">
            <VerseCard v={verse.day} />
            <VerseCard v={verse.week} compact />
          </div>
        </section>
      )}
      <section className="sec band" id="reader">
        <div className="wrap bible">
          <form className="bible-find" onSubmit={(e) => { e.preventDefault(); go(q); }}>
            <label className="field grow"><T k="bible.find" />
              <input type="search" id="bible-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('bible.findHint')} />
            </label>
            <button className="btn btn-gold" disabled={busy}><T k="bible.findBtn" /></button>
          </form>
          <div className="bible-nav">
            <label className="field"><T k="bible.book" />
              <select id="bible-book" value={book} onChange={(e) => load(Number(e.target.value), 1)}>
                <optgroup label={t('bible.oldT')}>{BOOKS.slice(0, 39).map(([n], i) => <option key={n} value={i + 1}>{tr === 'lug' ? BOOKS_LG[i] : n}</option>)}</optgroup>
                <optgroup label={t('bible.newT')}>{BOOKS.slice(39).map(([n], i) => <option key={n} value={i + 40}>{tr === 'lug' ? BOOKS_LG[i + 39] : n}</option>)}</optgroup>
              </select>
            </label>
            <label className="field"><T k="bible.chapter" />
              <select id="bible-ch" value={ch} onChange={(e) => load(book, Number(e.target.value))}>
                {Array.from({ length: BOOKS[book - 1][1] }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
              </select>
            </label>
            <label className="field"><T k="bible.translation" />
              <select id="bible-tr" value={tr || 'kjv'} onChange={(e) => (picked && mark.length ? go(picked.ref, e.target.value) : load(book, ch, e.target.value))}>
                {Object.entries(TRANSLATIONS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select>
            </label>
          </div>
          {err && <p className="err" role="alert">{err}</p>}

          {found && (
            <div className="bible-results">
              <h2 className="h3">{found.total ? (found.total === 1 ? t('bible.foundOne') : t('bible.found', { n: found.total })) : t('bible.foundNone')}{found.total > found.results.length ? t('bible.showingFirst', { n: found.results.length }) : ''}</h2>
              <ol>
                {found.results.map((r) => (
                  <li key={r.ref}><button type="button" className="linkbtn" onClick={() => { setQ(r.ref); go(r.ref); }}>{r.ref}</button> {r.t}</li>
                ))}
              </ol>
              <button type="button" className="linkbtn" onClick={() => setFound(null)}>{t('bible.backTo', { name: chapterName })}</button>
            </div>
          )}

          {data && !found && (
            <article className="chapter" aria-busy={busy}>
              <header>
                <h2 className="h2">{chapterName}</h2>
                <p>{TRANSLATIONS[data.translation]}</p>
              </header>
              <p className="hint"><T k="bible.tapHint" /></p>
              <div className="verses">
                {data.verses.map((v) => (
                  <span key={v.v} id={`v${v.v}`} className={mark.includes(v.v) ? 'vs on' : 'vs'} onClick={() => pick(v)} role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(v); } }}>
                    <sup>{v.v}</sup>{v.t}{' '}
                  </span>
                ))}
              </div>
              <div className="chapter-steps">
                <button type="button" className="btn btn-light" onClick={() => step(-1)} disabled={book === 1 && ch === 1}><T k="bible.prev" /></button>
                <button type="button" className="btn btn-light" onClick={() => step(1)} disabled={book === 66 && ch === 22}><T k="bible.next" /></button>
              </div>
              {data.credit && <p className="credit small">{data.credit}</p>}
            </article>
          )}
        </div>
      </section>
      {picked && (
        <div className="verse-bar band" role="region" aria-label={t('bible.selected')}>
          <div className="wrap">
            <p><b>{picked.ref}</b> {picked.text.length > 140 ? picked.text.slice(0, 140) + '…' : picked.text}</p>
            <div className="verse-acts">
              <a className="btn btn-gold" href={`https://wa.me/?text=${encodeURIComponent(`${share}\n\n${link}`)}`} target="_blank" rel="noopener noreferrer"><T k="bible.shareWa" /></a>
              <button type="button" className="linkbtn light" onClick={() => copy(share, picked.ref)}><T k="verse.copy" /></button>
              <SendTo light id="bar-send" text={`${share}\n\n${link}`} />
              <button type="button" className="linkbtn light" onClick={() => { setPicked(null); setMark([]); }}><T k="common.close" /></button>
            </div>
          </div>
        </div>
      )}
      <section className="sec band tint">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <Subscribe id="bible-subscribe" />
        </div>
      </section>
    </>
  );
}

