import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Banner, ClipCard, Tbc, useClips } from '../components/ui.jsx';
import { CHURCH, img, video } from '../data.js';
import { linkSite, niceDate, useLive, videoEmbed } from '../live.jsx';

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
      {s.audio && <audio controls preload="none" src={s.audio} style={{ width: '100%' }}>Your browser cannot play this audio.</audio>}
      {s.media_url && !videoEmbed(s.media_url) && (
        <div className="btn-row"><a className="btn btn-navy" href={s.media_url} target="_blank" rel="noopener noreferrer">Watch on {linkSite(s.media_url)}</a></div>
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
        {long && <button type="button" className="linkbtn" onClick={() => setOpen(!open)}>{open ? 'Show less' : 'Read more'}</button>}
        {(s.video || videoEmbed(s.media_url)) && open && <div className={'player ' + (videoEmbed(s.media_url)?.shape === 'tall' && !s.video ? 'tall' : 'wide')}><Media s={s} /></div>}
        {(s.video || videoEmbed(s.media_url)) && !open && <button type="button" className="linkbtn" onClick={() => setOpen(true)}>Watch</button>}
        <Listen s={s} />
      </div>
    </article>
  );
}

export default function Sermons() {
  const { sermons } = useLive();
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const latest = sermons[0];
  const clips = useClips();
  const list = clips.filter((c) => !term || `${c.title} ${c.kind} ${c.desc}`.toLowerCase().includes(term));
  const found = sermons.slice(1).filter((s) => !term || `${s.title} ${s.preacher} ${s.scripture} ${s.summary}`.toLowerCase().includes(term));
  const portrait = !latest || latest.video || videoEmbed(latest.media_url)?.shape === 'tall';
  return (
    <>
      <Banner photo="outdoor-service" eyebrow="The Word preached" title="Sermons" crumb="Sermons" />
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
            <p className="eyebrow" style={{ color: 'var(--accentText)' }}>Latest message</p>
            {latest ? (
              <>
                <h2 className="h2">{latest.title}</h2>
                <Byline s={latest} />
                {latest.summary && <p className="lead" style={{ whiteSpace: 'pre-line' }}>{latest.summary}</p>}
                <Listen s={latest} />
              </>
            ) : (
              <>
                <h2 className="h2"><Tbc>Sermon title</Tbc></h2>
                <p style={{ margin: 0, color: 'var(--muted)' }}><Tbc>Speaker</Tbc> · <Tbc>Date</Tbc> · <Tbc>Scripture</Tbc></p>
                <p className="lead">A moment from Sunday service in the hall at Burweta. Full messages are shared live on our Facebook page.</p>
              </>
            )}
            <div className="btn-row">
              <a className="btn btn-light" href={CHURCH.facebook} target="_blank" rel="noopener noreferrer">Watch live on Facebook</a>
              {CHURCH.youtube && <a className="btn btn-light" href={CHURCH.youtube} target="_blank" rel="noopener noreferrer">Our YouTube channel</a>}
              {CHURCH.tiktok && <a className="btn btn-light" href={CHURCH.tiktok} target="_blank" rel="noopener noreferrer">Follow on TikTok</a>}
            </div>
          </div>
        </div>
      </section>
      <section className="sec band tint">
        <div className="wrap">
          <div className="searchrow">
            <div className="stack" style={{ gap: 14 }}>
              <h2 className="h2">{sermons.length > 1 ? 'Past Sermons' : 'Recent Moments'}</h2>
              <div className="rule" />
            </div>
            <label className="field">
              Search
              <input type="search" id="clip-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Faith, healing, a preacher…" />
            </label>
          </div>
          {sermons.length > 1 && (
            <div className="sermons">
              {found.length ? found.map((s) => <SermonCard key={s.id} s={s} />) : <div className="empty">No sermons match “{q}”.</div>}
            </div>
          )}
          {sermons.length > 1 && <h3 className="h3" style={{ margin: '48px 0 20px' }}>Recent Moments</h3>}
          <div className="clips">
            {list.length ? list.map((c) => <ClipCard key={c.key} clip={c} list={list} />) : (
              <div className="empty" style={{ gridColumn: '1/-1' }}>No videos match “{q}”. Try worship, outreach or children.</div>
            )}
          </div>
        </div>
      </section>
      <section className="cta-band band">
        <div className="wrap">
          <h2>Hear the Word in person, Sundays at 8:30am</h2>
          <Link className="btn btn-navy" to="/contact">Plan your visit</Link>
        </div>
      </section>
    </>
  );
}
