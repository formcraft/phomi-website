import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { img, video } from '../data.js';
import { useT } from '../i18n.jsx';

const Ctx = createContext(null);
export const useOverlay = () => useContext(Ctx);

// Provides the photo/video lightbox and the small toast message used across the site.
export function OverlayProvider({ children }) {
  const [box, setBox] = useState(null); // { items:[{type,name,cap}], index }
  const [toast, setToast] = useState('');
  const timer = useRef();
  const closeBtn = useRef();
  const lastFocus = useRef(null);
  const t = useT();

  const say = useCallback((msg) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 2400);
  }, []);

  const open = useCallback((items, index = 0) => {
    lastFocus.current = document.activeElement;
    setBox({ items, index });
  }, []);

  const close = useCallback(() => {
    setBox(null);
    if (lastFocus.current) lastFocus.current.focus();
  }, []);

  const step = useCallback((d) => setBox((b) => b && { ...b, index: (b.index + d + b.items.length) % b.items.length }), []);

  const copy = useCallback(
    (text, label) => {
      const done = () => say(t('common.copied', { what: label || text }));
      try {
        navigator.clipboard.writeText(text).then(done, () => say(t('common.pressHold')));
      } catch {
        say(t('common.pressHold'));
      }
    },
    [say, t]
  );

  useEffect(() => {
    if (!box) return undefined;
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [box, close, step]);

  const it = box?.items[box.index];
  return (
    <Ctx.Provider value={{ open, say, copy }}>
      {children}
      {box && (
        <div className="lb" role="dialog" aria-modal="true" aria-label={t('common.viewer')} onClick={(e) => e.target === e.currentTarget && close()}>
          <button className="x" type="button" ref={closeBtn} onClick={close} aria-label={t('common.close')}>
            <Icon name="close" size={22} />
          </button>
          {box.items.length > 1 && (
            <>
              <button className="pv" type="button" onClick={() => step(-1)} aria-label={t('common.previous')}>
                <Icon name="left" size={22} />
              </button>
              <button className="nx" type="button" onClick={() => step(1)} aria-label={t('common.next')}>
                <Icon name="right" size={22} />
              </button>
            </>
          )}
          <figure>
            {it.type === 'embed' ? (
              <div className={'lb-embed ' + (it.shape || 'wide')}>
                <iframe key={it.src} src={it.src} title={it.cap} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
              </div>
            ) : it.type === 'link' ? (
              <div className="lb-link">
                <img src={it.poster || img('v-hall-worship')} alt="" />
                <a className="btn btn-gold" href={it.href} target="_blank" rel="noopener noreferrer">{t('common.watchOn', { site: it.site })}</a>
              </div>
            ) : it.type === 'video' ? (
              <video key={it.name} controls autoPlay playsInline poster={it.poster ?? img('v-' + it.name)}>
                <source src={video(it.name)} type="video/mp4" />
              </video>
            ) : (
              <img src={img(it.name)} alt={it.cap} />
            )}
            <figcaption>
              {it.cap}
              {it.type === 'img' && box.items.length > 1 ? ` · ${box.index + 1} / ${box.items.length}` : ''}
            </figcaption>
          </figure>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </Ctx.Provider>
  );
}
