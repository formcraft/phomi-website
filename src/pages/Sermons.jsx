import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Banner, ClipCard, Tbc } from '../components/ui.jsx';
import { CHURCH, CLIPS, img, video } from '../data.js';

export default function Sermons() {
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const list = CLIPS.filter((c) => !term || `${c.t} ${c.k} ${c.p}`.toLowerCase().includes(term));
  return (
    <>
      <Banner photo="outdoor-service" eyebrow="The Word preached" title="Sermons" crumb="Sermons" />
      <section className="sec band">
        <div className="wrap feature">
          <div className="player">
            <video controls playsInline preload="none" poster={img('v-sunday-service')}>
              <source src={video('sunday-service')} type="video/mp4" />
            </video>
          </div>
          <div className="txt">
            <p className="eyebrow" style={{ color: 'var(--accentText)' }}>Latest message</p>
            <h2 className="h2"><Tbc>Sermon title</Tbc></h2>
            <p style={{ margin: 0, color: 'var(--muted)' }}><Tbc>Speaker</Tbc> · <Tbc>Date</Tbc> · <Tbc>Scripture</Tbc></p>
            <p className="lead">A moment from Sunday service in the hall at Burweta. Full messages are shared live on our Facebook page.</p>
            <div className="btn-row"><a className="btn btn-navy" href={CHURCH.facebook} target="_blank" rel="noopener noreferrer">Watch on Facebook</a></div>
          </div>
        </div>
      </section>
      <section className="sec band tint">
        <div className="wrap">
          <div className="searchrow">
            <div className="stack" style={{ gap: 14 }}>
              <h2 className="h2">Recent Moments</h2>
              <div className="rule" />
            </div>
            <label className="field">
              Search videos
              <input type="search" id="clip-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Worship, outreach, children…" />
            </label>
          </div>
          <div className="clips">
            {list.length ? list.map((c) => <ClipCard key={c.v} clip={c} />) : (
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
