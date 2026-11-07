import { Link, useSearchParams } from 'react-router-dom';
import { useOverlay } from '../components/Overlay.jsx';
import { Banner, Photo, SectionHead, Tbc } from '../components/ui.jsx';
import { CLIPS, TIMES } from '../data.js';
import { PrayerWhen } from '../components/ui.jsx';
import { useLive } from '../live.jsx';

const TABS = [['worship', 'Worship'], ['outreach', 'Outreach'], ['bible-study', 'Bible Study']];

function Panel({ tab }) {
  const { open } = useOverlay();
  if (tab === 'outreach')
    return (
      <div className="split panel">
        <div className="stack">
          <h2 className="h2">Outreach</h2><div className="rule" />
          <p className="lead">We go out to reach needy people as fully as we are able, carrying the gospel together with practical care: education, feeding, healthcare and accommodation for the vulnerable.</p>
          <p className="lead"><Tbc>Where outreaches happen, how often, and a short story of one life changed</Tbc></p>
          <div className="btn-row">
            <Link className="btn btn-navy" to="/contact">Join our outreach</Link>
            <button
              className="btn btn-light"
              type="button"
              onClick={() => open(CLIPS.map((c) => ({ type: 'video', name: c.v, cap: `${c.t} · ${c.k}` })), CLIPS.findIndex((c) => c.v === 'crusade-ground'))}
            >
              Watch a crusade
            </button>
          </div>
        </div>
        <div className="framed"><Photo name="crusade-field" alt="Crowds at an outreach crusade" /></div>
      </div>
    );
  if (tab === 'bible-study')
    return (
      <div className="split panel">
        <div className="stack">
          <h2 className="h2">Bible Study</h2><div className="rule" />
          <p className="lead">We open the Scriptures together so that men and women know God's word, live by it and teach it to others. Bible study is free and open to everyone, whether you are new to the Bible or have read it for years.</p>
          <div className="facts">
            <div><strong>When</strong>{TIMES.bibleStudyDay || <Tbc>Day</Tbc>} · {TIMES.bibleStudyTime || <Tbc>Time</Tbc>}</div>
            <div><strong>Where</strong>PHOMI, Burweta</div>
            <div><strong>Who</strong>Everyone is welcome</div>
            <div><strong>Cost</strong>Free</div>
          </div>
          <div><Link className="btn btn-navy" to="/contact">Join a Bible study</Link></div>
        </div>
        <div className="framed"><Photo name="class-room" alt="Bible study in session" /></div>
      </div>
    );
  return (
    <div className="split panel">
      <div className="stack">
        <h2 className="h2">Worship</h2><div className="rule" />
        <p className="lead">Our Sunday gathering is the heart of our church family: praise, prayer and the preaching of God's word, so that people live by it.</p>
        <p className="lead"><Tbc>Choir, youth, children's ministry, women's and men's fellowships: list the groups PHOMI runs</Tbc></p>
        <div className="times">
          <span><strong>Sunday Service</strong> · 8:30am – 12:00pm</span>
          <span><strong>Prayer Time</strong> · <PrayerWhen /> {TIMES.prayerTime}</span>
        </div>
      </div>
      <div className="framed"><Photo name="sunday-pulpit" alt="Preaching at a Sunday service" /></div>
    </div>
  );
}

export default function Ministries() {
  useLive();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'worship';
  const care = [
    ['Education', 'Helping children and young people stay in school and learn.', 'kids-visit'],
    ['Feeding', 'Sharing meals and food support with families in need.', 'children'],
    ['Healthcare', 'Helping the sick and vulnerable reach care and medicine.', null],
    ['Accommodation', 'Offering shelter to those without a safe place to stay.', null]
  ];
  return (
    <>
      <Banner photo="children" eyebrow="Serving God, serving people" title="Our Ministries" crumb="Ministries" />
      <section className="sec band">
        <div className="wrap">
          <div className="tabs" role="tablist" aria-label="Ministries">
            {TABS.map(([id, label]) => (
              <button key={id} className="tab" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls="mpanel" onClick={() => setParams({ tab: id }, { replace: true, preventScrollReset: true })}>
                {label}
              </button>
            ))}
          </div>
          <div role="tabpanel" id="mpanel" aria-labelledby={`tab-${tab}`}><Panel tab={tab} /></div>
        </div>
      </section>
      <section className="sec band tint">
        <div className="wrap stack" style={{ gap: 36 }}>
          <SectionHead title="How We Care for the Vulnerable" gold lead="Rooted in James 1:27, our care reaches the whole person." />
          <div className="care">
            {care.map(([h, p, ph]) => (
              <article key={h}>
                <div className="im">{ph ? <Photo name={ph} /> : <div className="ph" style={{ height: '100%' }}>Photo to add</div>}</div>
                <div className="bd"><h3>{h}</h3><p>{p} <Tbc>Add details</Tbc></p></div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="cta-band band">
        <div className="wrap">
          <h2>Partner with us in the work</h2>
          <div className="btn-row">
            <Link className="btn btn-navy" to="/give">Give</Link>
            <Link className="btn btn-light" to="/contact">Volunteer</Link>
          </div>
        </div>
      </section>
    </>
  );
}
