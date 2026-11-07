import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useOverlay } from './Overlay.jsx';
import { CHURCH, CLIPS, PHOTOS, TIMES, img, srcSet } from '../data.js';
import { linkSite, niceDate, useLive, videoEmbed } from '../live.jsx';
import { T, useT } from '../i18n.jsx';

// Marks content the church still needs to supply. Shows as a gold highlight.
export function Tbc({ children }) {
  const t = useT();
  return (
    <span className="tbc" title={t('common.tbc')}>
      {children}
    </span>
  );
}

export function Photo({ name, alt = '', className = 'photo', eager, sizes = '(max-width: 640px) 100vw, 50vw' }) {
  return <img className={className} src={img(name)} srcSet={srcSet(name)} sizes={srcSet(name) ? sizes : undefined} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />;
}

export function Banner({ photo, eyebrow, title, crumb, children }) {
  return (
    <section className="banner band">
      {photo && <Photo name={photo} eager sizes="100vw" />}
      <div className="in">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {crumb && (
          <p className="crumb">
            <Link to="/"><T k="nav.home" /></Link> / {crumb}
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
  const t = useT();
  return TIMES.prayerDay ? <>{t.days(TIMES.prayerDay)}</> : <Tbc><T k="common.dayTbc" /></Tbc>;
}

export function GatherCards() {
  useLive();
  const t = useT();
  return (
    <div className="gather">
      <div className="gcard">
        <div className="ic"><Icon name="church" /></div>
        <div>
          <h3><T k="common.sundayService" /></h3>
          <p className="when">{t.days(TIMES.sunday)}</p>
          <p><T k="common.sundayDesc" /></p>
        </div>
      </div>
      <div className="gcard">
        <div className="ic"><Icon name="clock" /></div>
        <div>
          <h3><T k="common.prayerTime" /></h3>
          <p className="when"><PrayerWhen /> · {TIMES.prayerTime}</p>
          <p><T k="common.prayerDesc" /></p>
        </div>
      </div>
    </div>
  );
}

export function MapCard() {
  const t = useT();
  return (
    <div className="mapcard">
      <Photo name="church-dusk" alt={t('common.churchDusk')} />
      <div className="in">
        <strong style={{ fontFamily: 'var(--head)', fontSize: 22 }}><T k="common.mapName" /></strong>
        <span style={{ color: 'var(--onDark)', fontSize: 14 }}><T k="common.mapArea" /></span>
        <div>
          <a className="btn btn-gold" style={{ minHeight: 42 }} href={CHURCH.mapsUrl} target="_blank" rel="noopener noreferrer">
            <Icon name="pin" size={16} /> <T k="common.openMaps" />
          </a>
        </div>
      </div>
    </div>
  );
}

// Every short video on the site: ones added in the admin page or by email (YouTube, TikTok, Facebook or an MP4)
// come first, then the built-in clips.
export function useClips() {
  const { videos = [] } = useLive();
  const t = useT();
  const live = videos.map((v) => {
    const e = videoEmbed(v.link);
    const cap = `${v.title} · ${v.category}`;
    const item = v.video
      ? { type: 'video', name: v.video, poster: v.cover || '', cap }
      : e
        ? { type: 'embed', src: e.src, shape: e.shape, cap }
        : { type: 'link', href: v.link, site: linkSite(v.link), poster: v.cover, cap };
    return {
      key: 'v' + v.id,
      title: v.title,
      kind: v.category,
      desc: [niceDate(v.posted_on), v.video ? '' : e?.site || linkSite(v.link)].filter(Boolean).join(' · '),
      site: v.video ? '' : e?.site || linkSite(v.link),
      thumb: v.cover || e?.thumb || img('v-hall-worship'),
      item,
    };
  });
  const built = CLIPS.map((c) => {
    const title = t(`clip.${c.v}.t`);
    const kind = t(`gallery.cat.${c.k}`);
    return {
      key: c.v, title, kind, desc: t(`clip.${c.v}.p`), dur: c.d, thumb: img('v-' + c.v),
      item: { type: 'video', name: c.v, cap: `${title} · ${kind}` },
    };
  });
  return [...live, ...built];
}

export function ClipCard({ clip, list }) {
  const { open } = useOverlay();
  return (
    <button className="clip" type="button" onClick={() => open(list.map((c) => c.item), Math.max(0, list.indexOf(clip)))}>
      <div className="th">
        <img src={clip.thumb} alt="" loading="lazy" decoding="async" />
        <div className="play"><span><Icon name="play" size={24} /></span></div>
        {clip.site && <span className="site">{clip.site}</span>}
        {clip.dur && <span className="dur">{clip.dur}</span>}
      </div>
      <div className="bd">
        <p className="kind">{clip.kind}</p>
        <h3>{clip.title}</h3>
        {clip.desc && <p>{clip.desc}</p>}
      </div>
    </button>
  );
}

// The built-in photos with captions in the visitor's language: [name, caption, category]
export function usePhotos() {
  const t = useT();
  return PHOTOS.map(([n, , c]) => [n, t(`photo.${n}`), c]);
}

// Opens a photo in the lightbox, stepping through the given list (defaults to every photo).
export function usePhotoViewer() {
  const { open } = useOverlay();
  const photos = usePhotos();
  return (name, list = photos) => {
    const items = list.map(([n, cap]) => ({ type: 'img', name: n, cap }));
    open(items, Math.max(0, items.findIndex((x) => x.name === name)));
  };
}

export function CopyButton({ text, label, children }) {
  const { copy } = useOverlay();
  return (
    <button className="copy" type="button" onClick={() => copy(text, label)}>
      {children || <T k="common.copy" />}
    </button>
  );
}
