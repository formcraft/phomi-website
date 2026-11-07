import { useState } from 'react';
import { Banner, usePhotoViewer, usePhotos } from '../components/ui.jsx';
import { GALLERY_CATS, img, srcSet } from '../data.js';
import { T, useT } from '../i18n.jsx';
import { useLive } from '../live.jsx';

export default function Gallery() {
  const [cat, setCat] = useState('All');
  const view = usePhotoViewer();
  const { photos } = useLive();
  const t = useT();
  const builtIn = usePhotos();
  const catName = (c) => (t(`gallery.cat.${c}`) === `gallery.cat.${c}` ? c : t(`gallery.cat.${c}`));
  // Newest photos (from the admin page or by email) first, then the built-in ones
  const all = [...photos.map((p) => [p.file, p.caption || t('gallery.defaultCap'), p.category, p.thumb]), ...builtIn];
  const list = all.filter((p) => cat === 'All' || p[2] === cat);
  return (
    <>
      <Banner photo="service-hall" eyebrow={<T k="gallery.eyebrow" />} title={<T k="gallery.title" />} crumb={<T k="gallery.crumb" />} />
      <section className="sec band">
        <div className="wrap">
          <div className="chips" role="group" aria-label={t('gallery.filter')}>
            {GALLERY_CATS.map((c) => (
              <button key={c} className="tab" type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{catName(c)}</button>
            ))}
          </div>
          <div className="masonry">
            {list.map(([n, alt, c, thumb]) => (
              <button key={n} type="button" onClick={() => view(n, list)} aria-label={t('common.viewPhoto', { name: alt })}>
                <img src={thumb || img(n)} srcSet={thumb ? undefined : srcSet(n)} sizes="(max-width: 640px) 50vw, 25vw" alt={alt} loading="lazy" decoding="async" />
                <span className="lbl">{catName(c)}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
