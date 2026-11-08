import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Banner, ClipCard, Tbc, useClips } from '../components/ui.jsx';
import { CHURCH, img, video } from '../data.js';
import { linkSite, niceDate, useLive, videoEmbed } from '../live.jsx';
import { T, useT } from '../i18n.jsx';

function Media({ s }) {
  const em = videoEmbed(s.media_url);
  if (s.video) {
    return (
      <video controls playsInline preload="none" poster={s.cover || img('v-sunday-service')}>
        <source src={s.video} type="video/mp4" />
      </video>
    );
  }
  if (em) return <iframe src={em.src} title={s.title} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />;
  return <img src={s.cover || img('sunday-pulpit')} alt="" />;
}

function Byline({ s }) {
  const bits = [s.preacher, niceDate(s.preached_on), s.scripture].filter(Boolean);
  return bits.length ? <p style={{ margin: 0, color: 'var(--muted)' }}>{bits.join(' · ')}</p> : null;
}

function Listen({ s }) {
  return (
    <>
      {s.audio && <audio controls preload="none" src={s.audio} style={{ width: '100%' }}><T k="sermons.noAudio" /></audio>}
      {s.media_url && !videoEmbed(s.media_url) && (
        <div className="btn-row"><a className="btn btn-navy" href={s.media_url} target="_blank" rel="noopener noreferrer"><T k="common.watchOn" vars={{ site: linkSite(s.media_url) }} /></a></div>
      )}
    </>
  );
}

function SermonCard({ s }) {
  const [open, setOpen] = useState(false);
  const long = (s.summary || '').length > 220;
  return (
    <article className="sermon">
      <div className="th"><img src={s.cover || img('sunday-pulpit')} alt="" loading="lazy" /></div>
      <div className="bd">
        <h3>{s.title}</h3>
        <Byline s={s} />
        {s.summary && <p className="sum">{open || !long ? s.summary : s.summary.slice(0, 220).trim() + '…'}</p>}
        {long && <button type="button" className="linkbtn" onClick={() => setOpen(!open)}><T k={open ? 'sermons.showLess' : 'sermons.readMore'} /></button>}
        {(s.video || videoEmbed(s.media_url)) && open && <div className={'player ' + (videoEmbed(s.media_url)?.shape === 'tall' && !s.video ? 'tall' : 'wide')}><Media s={s} /></div>}
        {(s.video || videoEmbed(s.media_url)) && !open && <button type="button" className="linkbtn" onClick={() => setOpen(true)}><T k="sermons.watch" /></button>}
        <Listen s={s} />
      </div>
    </article>
  );
}

export default function Sermons() {
  const { sermons } = useLive();
  const t = useT();
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const latest = sermons[0];
  const clips = useClips();
  const list = clips.filter((c) => !term || `${c.title} ${c.kind} ${c.desc}`.toLowerCase().includes(term));
  const found = sermons.slice(1).filter((s) => !term || `${s.title} ${s.preacher} ${s.scripture} ${s.summary}`.toLowerCase().includes(term));
  const portrait = !latest || latest.video || videoEmbed(latest.media_url)?.shape === 'tall';
  return (
    <>
      <Banner photo="outdoor-service" eyebrow={<T k="sermons.eyebrow" />} title={<T k="sermons.title" />} crumb={<T k="sermons.crumb" />} />
      <section className="sec band">
        <div className="wrap feature">
          <div className={portrait ? 'player' : 'player wide'}>
            {latest ? <Media s={latest} /> : (
              <video controls playsInline preload="none" poster={img('v-sunday-service')}>
                <source src={video('sunday-service')} type="video/mp4" />
              </video>
            )}
          </div>
          <div className="txt">
            <p className="eyebrow" style={{ color: 'var(--accentText)' }}><T k="sermons.latest" /></p>
            {latest ? (
              <>
                <h2 className="h2">{latest.title}</h2>
                <Byline s={latest} />
                {latest.summary && <p className="lead" style={{ whiteSpace: 'pre-line' }}>{latest.summary}</p>}
                <Listen s={latest} />
              </>
            ) : (
              <>
                <h2 className="h2"><Tbc><T k="sermons.titleTbc" /></Tbc></h2>
                <p style={{ margin: 0, color: 'var(--muted)' }}><Tbc><T k="sermons.speakerTbc" /></Tbc> · <Tbc><T k="sermons.dateTbc" /></Tbc> · <Tbc><T k="sermons.scriptureTbc" /></Tbc></p>
                <p className="lead"><T k="sermons.placeholder" /></p>
              </>
            )}
            <div className="btn-row">
              <a className="btn btn-light" href={CHURCH.facebook} target="_blank" rel="noopener noreferrer"><T k="sermons.facebook" /></a>
              {CHURCH.youtube && <a className="btn btn-light" href={CHURCH.youtube} target="_blank" rel="noopener noreferrer"><T k="sermons.youtube" /></a>}
              {CHURCH.tiktok && <a className="btn btn-light" href={CHURCH.tiktok} target="_blank" rel="noopener noreferrer"><T k="sermons.tiktok" /></a>}
            </div>
          </div>
        </div>
      </section>
      <section className="sec band tint">
        <div className="wrap">
          <div className="searchrow">
            <div className="stack" style={{ gap: 14 }}>
              <h2 className="h2"><T k={sermons.length > 1 ? 'sermons.past' : 'sermons.recent'} /></h2>
              <div className="rule" />
            </div>
            <label className="field">
              <T k="sermons.search" />
              <input type="search" id="clip-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('sermons.searchHint')} />
            </label>
          </div>
          {sermons.length > 1 && (
            <div className="sermons">
              {found.length ? found.map((s) => <SermonCard key={s.id} s={s} />) : <div className="empty"><T k="sermons.noSermons" vars={{ q }} /></div>}
            </div>
          )}
          {sermons.length > 1 && <h3 className="h3" style={{ margin: '48px 0 20px' }}><T k="sermons.recent" /></h3>}
          <div className="clips">
            {list.length ? list.map((c) => <ClipCard key={c.key} clip={c} list={list} />) : (
              <div className="empty" style={{ gridColumn: '1/-1' }}><T k="sermons.noVideos" vars={{ q }} /></div>
            )}
          </div>
        </div>
      </section>
      <section className="cta-band band">
        <div className="wrap">
          <h2><T k="sermons.ctaTitle" /></h2>
          <Link className="btn btn-navy" to="/contact"><T k="common.planVisit" /></Link>
        </div>
      </section>
    </>
  );
}
