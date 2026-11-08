import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { Banner, Photo, PrayerWhen, Tbc } from '../components/ui.jsx';
import { EVENTS, TIMES } from '../data.js';
import { eventCard, useLive } from '../live.jsx';
import { SITE_URL } from '../seo.js';
import { T, useT } from '../i18n.jsx';

// Coming events for Google, so they can show in search with their date and place
const eventSchema = (list) => JSON.stringify(list.filter((e) => e.starts_at).map((e) => ({
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: e.title,
  startDate: String(e.starts_at).replace(' ', 'T'),
  ...(e.ends_at ? { endDate: String(e.ends_at).replace(' ', 'T') } : {}),
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  eventStatus: 'https://schema.org/EventScheduled',
  location: { '@type': 'Place', name: e.venue || "Potter's House, Burweta", address: { '@type': 'PostalAddress', addressLocality: 'Butebo', addressRegion: 'Butebo District', addressCountry: 'UG' } },
  organizer: { '@type': 'Organization', name: "Potter's House Outreach Ministries International", url: SITE_URL },
  ...(e.details ? { description: e.details.slice(0, 300) } : {}),
  ...(e.cover ? { image: e.cover.startsWith('http') ? e.cover : SITE_URL + e.cover } : {}),
}))).replace(/</g, '\\u003c');

function EventCard({ e }) {
  const t = useT();
  return (
    <article className="ev">
      <div className="date"><b>{e.day}</b><span>{e.mon}</span></div>
      <div className="im"><Photo name={e.photo || 'crusade-field'} /></div>
      <div className="bd">
        <p className="kind">{e.kind === 'Event' ? t('common.event') : e.kind}</p>
        <h2>{e.name}</h2>
        <p>{e.time === 'All day' ? t('common.allDay') : e.time} · {e.venue}</p>
        {e.details && <p style={{ whiteSpace: 'pre-line' }}>{e.details}</p>}
      </div>
    </article>
  );
}

export default function Events() {
  const { events: live } = useLive();
  const t = useT();
  const upcoming = [...live.map(eventCard), ...EVENTS];
  const [view, setView] = useState('upcoming');
  const weekly = [
    ['common.sundayService', <>{t.days(TIMES.sunday)}</>, 'events.sun', 'sunday-pulpit'],
    ['common.prayerTime', <><PrayerWhen /> · {TIMES.prayerTime}</>, 'events.pray', 'kneeling-prayer'],
    ['common.bibleStudy', <>{TIMES.bibleStudyDay ? t.days(TIMES.bibleStudyDay) : <Tbc><T k="common.day" /></Tbc>} · {TIMES.bibleStudyTime || <Tbc><T k="common.time" /></Tbc>}</>, 'events.study', 'class-room-2']
  ];
  return (
    <>
      <Banner photo="outdoor-service" eyebrow={<T k="events.eyebrow" />} title={<T k="events.title" />} crumb={<T k="events.crumb" />} />
      {live.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: eventSchema(live) }} />}
      <section className="sec band">
        <div className="wrap">
          <div className="tabs" role="tablist" aria-label={t('events.view')}>
            {[['upcoming', 'events.upcoming'], ['weekly', 'events.weekly']].map(([id, l]) => (
              <button key={id} className="tab" role="tab" aria-selected={view === id} onClick={() => setView(id)}><T k={l} /></button>
            ))}
          </div>
          <div role="tabpanel">
            {view === 'upcoming' ? (
              <div className="evlist">
                {upcoming.length ? upcoming.map((e) => <EventCard key={e.key || e.name + e.day} e={e} />) : (
                  <div className="empty stack center" style={{ gap: 12 }}>
                    <Icon name="clock" size={40} style={{ color: 'var(--accentText)' }} />
                    <strong style={{ fontFamily: 'var(--head)', fontSize: 22, color: 'var(--dark)' }}><T k="events.none" /></strong>
                    <span><T k="events.noneText" /></span>
                    <button className="btn btn-navy" type="button" onClick={() => setView('weekly')}><T k="events.seeWeekly" /></button>
                  </div>
                )}
              </div>
            ) : (
              <div className="evlist">
                {weekly.map(([h, w, d, ph]) => (
                  <article className="ev" key={h}>
                    <div className="date"><b style={{ fontSize: 22 }}><T k={d} /></b><span><T k="events.weeklyTag" /></span></div>
                    <div className="im"><Photo name={ph} /></div>
                    <div className="bd">
                      <h2><T k={h} /></h2>
                      <p style={{ color: 'var(--accentText)', fontWeight: 600 }}>{w}</p>
                      <p><T k="common.place" /></p>
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
          <h2><T k="events.ctaTitle" /></h2>
          <Link className="btn btn-navy" to="/contact"><T k="events.ctaBtn" /></Link>
        </div>
      </section>
    </>
  );
}
