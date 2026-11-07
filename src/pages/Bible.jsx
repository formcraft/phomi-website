import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Banner } from '../components/ui.jsx';
import { SendTo, Subscribe, VerseCard } from '../components/Verse.jsx';
import { useOverlay } from '../components/Overlay.jsx';
import { api } from '../api.js';
import { BOOKS, TRANSLATIONS } from '../bible-books.js';
import { useLive } from '../live.jsx';

const KEY = 'phomi-bible';
const remember = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode */ } };

export default function Bible() {
  const { verse } = useLive();
  const { copy } = useOverlay();
  const [params, setParams] = useSearchParams();
  const last = useMemo(remember, []);
  const [tr, setTr] = useState(params.get('tr') || last.tr || '');
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
      setErr(x.status === 404 ? 'The Bible is not available until the website server is set up.' : x.message);
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
      setErr(x.status === 404 && !x.data?.error ? 'The Bible is not available until the website server is set up.' : x.message);
    } finally {
      setBusy(false);
    }
  };

  const step = (d) => {
    let b = book;
    let c = ch + d;
    if (c < 1) { b = Math.max(1, b - 1); c = BOOKS[b - 1][1]; }
    if (c > BOOKS[b - 1][1]) { b = Math.min(66, b + 1); c = 1; }
    load(b, c);
    window.scrollTo({ top: document.getElementById('reader')?.offsetTop - 80, behavior: 'smooth' });
  };

  const pick = (v) => {
    const name = data.name === 'Psalms' ? 'Psalm' : data.name;
    const ref = data.chapters === 1 ? `${name} ${v.v}` : `${name} ${data.chapter}:${v.v}`;
    setMark([v.v]);
    setPicked({ ref, text: v.t, translation: data.translation, verses: [v] });
    setParams({ ref, tr: data.translation }, { replace: true });
  };

  const chapterName = data ? `${data.name === 'Psalms' ? 'Psalm' : data.name} ${data.chapter}` : '';
  return (
    <>
      <Banner photo="class-room" eyebrow="The Word of God" title="The Bible" crumb="Bible" />
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
            <label className="field grow">Find a verse or search words
              <input type="search" id="bible-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="John 3:16, Psalm 23, or words like “living water”" />
            </label>
            <button className="btn btn-gold" disabled={busy}>Find</button>
          </form>
          <div className="bible-nav">
            <label className="field">Book
              <select id="bible-book" value={book} onChange={(e) => load(Number(e.target.value), 1)}>
                <optgroup label="Old Testament">{BOOKS.slice(0, 39).map(([n], i) => <option key={n} value={i + 1}>{n}</option>)}</optgroup>
                <optgroup label="New Testament">{BOOKS.slice(39).map(([n], i) => <option key={n} value={i + 40}>{n}</option>)}</optgroup>
              </select>
            </label>
            <label className="field">Chapter
              <select id="bible-ch" value={ch} onChange={(e) => load(book, Number(e.target.value))}>
                {Array.from({ length: BOOKS[book - 1][1] }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
              </select>
            </label>
            <label className="field">Translation
              <select id="bible-tr" value={tr || 'kjv'} onChange={(e) => (picked && mark.length ? go(picked.ref, e.target.value) : load(book, ch, e.target.value))}>
                {Object.entries(TRANSLATIONS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select>
            </label>
          </div>
          {err && <p className="err" role="alert">{err}</p>}

          {found && (
            <div className="bible-results">
              <h2 className="h3">{found.total ? `${found.total} verse${found.total === 1 ? '' : 's'} found` : 'Nothing found'}{found.total > found.results.length ? `, showing the first ${found.results.length}` : ''}</h2>
              <ol>
                {found.results.map((r) => (
                  <li key={r.ref}><button type="button" className="linkbtn" onClick={() => { setQ(r.ref); go(r.ref); }}>{r.ref}</button> {r.t}</li>
                ))}
              </ol>
              <button type="button" className="linkbtn" onClick={() => setFound(null)}>Back to {chapterName}</button>
            </div>
          )}

          {data && !found && (
            <article className="chapter" aria-busy={busy}>
              <header>
                <h2 className="h2">{chapterName}</h2>
                <p>{TRANSLATIONS[data.translation]}</p>
              </header>
              <p className="hint">Tap a verse to share it.</p>
              <div className="verses">
                {data.verses.map((v) => (
                  <span key={v.v} id={`v${v.v}`} className={mark.includes(v.v) ? 'vs on' : 'vs'} onClick={() => pick(v)} role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(v); } }}>
                    <sup>{v.v}</sup>{v.t}{' '}
                  </span>
                ))}
              </div>
              <div className="chapter-steps">
                <button type="button" className="btn btn-light" onClick={() => step(-1)} disabled={book === 1 && ch === 1}>Previous chapter</button>
                <button type="button" className="btn btn-light" onClick={() => step(1)} disabled={book === 66 && ch === 22}>Next chapter</button>
              </div>
            </article>
          )}
        </div>
      </section>
      {picked && (
        <div className="verse-bar band" role="region" aria-label="Selected verse">
          <div className="wrap">
            <p><b>{picked.ref}</b> {picked.text.length > 140 ? picked.text.slice(0, 140) + '…' : picked.text}</p>
            <div className="verse-acts">
              <a className="btn btn-gold" href={`https://wa.me/?text=${encodeURIComponent(`“${picked.text}”\n${picked.ref} (${picked.translation.toUpperCase()})\n\n${window.location.origin}/bible?ref=${encodeURIComponent(picked.ref)}`)}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
              <button type="button" className="linkbtn light" onClick={() => copy(`“${picked.text}”\n${picked.ref} (${picked.translation.toUpperCase()})`, picked.ref)}>Copy</button>
              <SendTo light id="bar-send" text={`“${picked.text}”\n${picked.ref} (${picked.translation.toUpperCase()})\n\n${window.location.origin}/bible?ref=${encodeURIComponent(picked.ref)}`} />
              <button type="button" className="linkbtn light" onClick={() => { setPicked(null); setMark([]); }}>Close</button>
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

