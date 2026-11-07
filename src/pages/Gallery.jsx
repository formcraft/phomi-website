import { useState } from 'react';
import { Banner, usePhotoViewer } from '../components/ui.jsx';
import { GALLERY_CATS, PHOTOS, img } from '../data.js';

export default function Gallery() {
  const [cat, setCat] = useState('All');
  const view = usePhotoViewer();
  const list = PHOTOS.filter((p) => cat === 'All' || p[2] === cat);
  return (
    <>
      <Banner photo="service-hall" eyebrow="Life at Potter's House" title="Gallery" crumb="Gallery" />
      <section className="sec band">
        <div className="wrap">
          <div className="chips" role="group" aria-label="Filter photos">
            {GALLERY_CATS.map((c) => (
              <button key={c} className="tab" type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
          <div className="masonry">
            {list.map(([n, alt, c]) => (
              <button key={n} type="button" onClick={() => view(n, list)} aria-label={`View photo: ${alt}`}>
                <img src={img(n)} alt={alt} loading="lazy" decoding="async" />
                <span className="lbl">{c}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
