import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useOverlay } from './Overlay.jsx';
import { CHURCH, CLIPS, PHOTOS, TIMES, img } from '../data.js';
import { useLive } from '../live.jsx';

// Marks content the church still needs to supply. Shows as a gold highlight.
export function Tbc({ children }) {
  return (
    <span className="tbc" title="To confirm with the church">
      {children}
    </span>
  );
}

export function Photo({ name, alt = '', className = 'photo', eager }) {
  return <img className={className} src={img(name)} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />;
}

export function Banner({ photo, eyebrow, title, crumb, children }) {
  return (
    <section className="banner band">
      {photo && <Photo name={photo} eager />}
      <div className="in">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {crumb && (
          <p className="crumb">
            <Link to="/">Home</Link> / {crumb}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

export function Quote({ photo, text, cite }) {
  return (
    <section className="quote band">
      <Photo name={photo} />
      <div className="in">
        <q>{text}</q>
        <cite>{cite}</cite>
      </div>
    </section>
  );
}

export function SectionHead({ title, gold, lead, children }) {
  return (
    <div className="stack center">
      <h2 className="h2">{title}</h2>
      <div className={gold ? 'rule gold' : 'rule'} />
      {children}
      {lead && <p className="lead">{lead}</p>}
    </div>
  );
}

export function PrayerWhen() {
  useLive();
  return TIMES.prayerDay ? <>{TIMES.prayerDay}</> : <Tbc>Day to confirm</Tbc>;
}

export function GatherCards() {
  useLive();
  return (
    <div className="gather">
      <div className="gcard">
        <div className="ic"><Icon name="church" /></div>
        <div>
          <h3>Sunday Service</h3>
          <p className="when">{TIMES.sunday}</p>
          <p>Praise, worship and the preaching of the Word, at PHOMI, Burweta, Butebo District.</p>
        </div>
      </div>
      <div className="gcard">
        <div className="ic"><Icon name="clock" /></div>
        <div>
          <h3>Prayer Time</h3>
          <p className="when"><PrayerWhen /> · {TIMES.prayerTime}</p>
          <p>An evening of intercession for our families, our community and the nations.</p>
        </div>
      </div>
    </div>
  );
}

export function MapCard() {
  return (
    <div className="mapcard">
      <Photo name="church-dusk" alt="The church at dusk" />
      <div className="in">
        <strong style={{ fontFamily: 'var(--head)', fontSize: 22 }}>PHOMI, Burweta</strong>
        <span style={{ color: 'var(--onDark)', fontSize: 14 }}>Butebo District, Eastern Uganda · P.O. Box 1972, Mbale</span>
        <div>
          <a className="btn btn-gold" style={{ minHeight: 42 }} href={CHURCH.mapsUrl} target="_blank" rel="noopener noreferrer">
            <Icon name="pin" size={16} /> Open in Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}

export function ClipCard({ clip }) {
  const { open } = useOverlay();
  const items = CLIPS.map((c) => ({ type: 'video', name: c.v, cap: `${c.t} · ${c.k}` }));
  return (
    <button className="clip" type="button" onClick={() => open(items, CLIPS.indexOf(clip))}>
      <div className="th">
        <Photo name={'v-' + clip.v} />
        <div className="play"><span><Icon name="play" size={24} /></span></div>
        <span className="dur">{clip.d}</span>
      </div>
      <div className="bd">
        <p className="kind">{clip.k}</p>
        <h3>{clip.t}</h3>
        <p>{clip.p}</p>
      </div>
    </button>
  );
}

// Opens a photo in the lightbox, stepping through the given list (defaults to every photo).
export function usePhotoViewer() {
  const { open } = useOverlay();
  return (name, list = PHOTOS) => {
    const items = list.map(([n, cap]) => ({ type: 'img', name: n, cap }));
    open(items, Math.max(0, items.findIndex((x) => x.name === name)));
  };
}

export function CopyButton({ text, label, children }) {
  const { copy } = useOverlay();
  return (
    <button className="copy" type="button" onClick={() => copy(text, label)}>
      {children || 'Copy'}
    </button>
  );
}
