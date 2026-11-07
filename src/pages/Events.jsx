import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { Banner, Photo, PrayerWhen, Tbc } from '../components/ui.jsx';
import { EVENTS, TIMES } from '../data.js';

function EventCard({ e }) {
  return (
    <article className="ev">
      <div className="date"><b>{e.day}</b><span>{e.mon}</span></div>
      <div className="im"><Photo name={e.photo || 'crusade-field'} /></div>
      <div className="bd">
        <p className="kind">{e.kind}</p>
        <h2>{e.name}</h2>
        <p>{e.time} · {e.venue}</p>
      </div>
    </article>
  );
}

export default function Events() {
  const [view, setView] = useState(EVENTS.length ? 'upcoming' : 'upcoming');
  const weekly = [
    ['Sunday Service', <>{TIMES.sunday}</>, 'SUN', 'sunday-pulpit'],
    ['Prayer Time', <><PrayerWhen /> · {TIMES.prayerTime}</>, 'PRAY', 'kneeling-prayer'],
    ['Bible Study', <>{TIMES.bibleStudyDay || <Tbc>Day</Tbc>} · {TIMES.bibleStudyTime || <Tbc>Time</Tbc>}</>, 'STUDY', 'class-room-2']
  ];
  return (
    <>
      <Banner photo="outdoor-service" eyebrow="Gather with us" title="Events" crumb="Events" />
      <section className="sec band">
        <div className="wrap">
          <div className="tabs" role="tablist" aria-label="Event view">
            {[['upcoming', 'Upcoming'], ['weekly', 'Weekly gatherings']].map(([id, l]) => (
              <button key={id} className="tab" role="tab" aria-selected={view === id} onClick={() => setView(id)}>{l}</button>
            ))}
          </div>
          <div role="tabpanel">
            {view === 'upcoming' ? (
              <div className="evlist">
                {EVENTS.length ? EVENTS.map((e) => <EventCard key={e.name + e.day} e={e} />) : (
                  <div className="empty stack center" style={{ gap: 12 }}>
                    <Icon name="clock" size={40} style={{ color: 'var(--accentText)' }} />
                    <strong style={{ fontFamily: 'var(--head)', fontSize: 22, color: 'var(--dark)' }}>No dated events yet</strong>
                    <span>Conferences, crusades, special Bible study series and youth days will be listed here as the church office announces them. Our weekly gatherings continue every week.</span>
                    <button className="btn btn-navy" type="button" onClick={() => setView('weekly')}>See weekly gatherings</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="evlist">
                {weekly.map(([h, w, d, ph]) => (
                  <article className="ev" key={h}>
                    <div className="date"><b style={{ fontSize: 22 }}>{d}</b><span>weekly</span></div>
                    <div className="im"><Photo name={ph} /></div>
                    <div className="bd">
                      <h2>{h}</h2>
                      <p style={{ color: 'var(--accentText)', fontWeight: 600 }}>{w}</p>
                      <p>PHOMI, Burweta, Butebo District</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="cta-band band">
        <div className="wrap">
          <h2>Planning an outreach or crusade with us?</h2>
          <Link className="btn btn-navy" to="/contact">Get in touch</Link>
        </div>
      </section>
    </>
  );
}
