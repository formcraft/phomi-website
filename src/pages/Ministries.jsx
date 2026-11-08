import { Link, useSearchParams } from 'react-router-dom';
import { useOverlay } from '../components/Overlay.jsx';
import { Banner, Photo, PrayerWhen, SectionHead, Tbc, useClips } from '../components/ui.jsx';
import { TIMES } from '../data.js';
import { useLive } from '../live.jsx';
import { T, useT } from '../i18n.jsx';

const TABS = [['worship', 'ministries.tabWorship'], ['outreach', 'ministries.tabOutreach'], ['bible-study', 'ministries.tabStudy']];

function Panel({ tab }) {
  const { open } = useOverlay();
  const t = useT();
  const clips = useClips().filter((c) => !c.key.startsWith('v'));
  if (tab === 'outreach')
    return (
      <div className="split panel">
        <div className="stack">
          <h2 className="h2"><T k="ministries.outreachTitle" /></h2><div className="rule" />
          <p className="lead"><T k="ministries.outreachText" /></p>
          <p className="lead"><Tbc><T k="ministries.outreachTbc" /></Tbc></p>
          <div className="btn-row">
            <Link className="btn btn-navy" to="/contact"><T k="ministries.joinOutreach" /></Link>
            <button
              className="btn btn-light"
              type="button"
              onClick={() => open(clips.map((c) => c.item), Math.max(0, clips.findIndex((c) => c.key === 'crusade-ground')))}
            >
              <T k="ministries.watchCrusade" />
            </button>
          </div>
        </div>
        <div className="framed"><Photo name="crusade-field" alt={t('ministries.crusadePhoto')} /></div>
      </div>
    );
  if (tab === 'bible-study')
    return (
      <div className="split panel">
        <div className="stack">
          <h2 className="h2"><T k="ministries.studyTitle" /></h2><div className="rule" />
          <p className="lead"><T k="ministries.studyText" /></p>
          <div className="facts">
            <div><strong><T k="ministries.when" /></strong>{TIMES.bibleStudyDay ? t.days(TIMES.bibleStudyDay) : <Tbc><T k="common.day" /></Tbc>} · {TIMES.bibleStudyTime || <Tbc><T k="common.time" /></Tbc>}</div>
            <div><strong><T k="ministries.where" /></strong>PHOMI, Burweta</div>
            <div><strong><T k="ministries.who" /></strong><T k="ministries.whoText" /></div>
            <div><strong><T k="ministries.cost" /></strong><T k="ministries.free" /></div>
          </div>
          <div><Link className="btn btn-navy" to="/contact"><T k="ministries.joinStudy" /></Link></div>
        </div>
        <div className="framed"><Photo name="class-room" alt={t('ministries.studyPhoto')} /></div>
      </div>
    );
  return (
    <div className="split panel">
      <div className="stack">
        <h2 className="h2"><T k="ministries.worshipTitle" /></h2><div className="rule" />
        <p className="lead"><T k="ministries.worshipText" /></p>
        <p className="lead"><Tbc><T k="ministries.worshipTbc" /></Tbc></p>
        <div className="times">
          <span><strong><T k="common.sundayService" /></strong> · <T k="ministries.sundayTimes" /></span>
          <span><strong><T k="common.prayerTime" /></strong> · <PrayerWhen /> {TIMES.prayerTime}</span>
        </div>
      </div>
      <div className="framed"><Photo name="sunday-pulpit" alt={t('ministries.pulpitPhoto')} /></div>
    </div>
  );
}

export default function Ministries() {
  useLive();
  const t = useT();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'worship';
  const care = [['ministries.care1', 'kids-visit'], ['ministries.care2', 'children'], ['ministries.care3', null], ['ministries.care4', null]];
  return (
    <>
      <Banner photo="children" eyebrow={<T k="ministries.eyebrow" />} title={<T k="ministries.title" />} crumb={<T k="ministries.crumb" />} />
      <section className="sec band">
        <div className="wrap">
          <div className="tabs" role="tablist" aria-label={t('ministries.crumb')}>
            {TABS.map(([id, key]) => (
              <button key={id} className="tab" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls="mpanel" onClick={() => setParams({ tab: id }, { replace: true, preventScrollReset: true })}>
                <T k={key} />
              </button>
            ))}
          </div>
          <div role="tabpanel" id="mpanel" aria-labelledby={`tab-${tab}`}><Panel tab={tab} /></div>
        </div>
      </section>
      <section className="sec band tint">
        <div className="wrap stack" style={{ gap: 36 }}>
          <SectionHead title={<T k="ministries.careTitle" />} gold lead={<T k="ministries.careLead" />} />
          <div className="care">
            {care.map(([k, ph]) => (
              <article key={k}>
                <div className="im">{ph ? <Photo name={ph} /> : <div className="ph" style={{ height: '100%' }}><T k="ministries.photoToAdd" /></div>}</div>
                <div className="bd"><h3><T k={k} /></h3><p><T k={`${k}p`} /> <Tbc><T k="common.addDetails" /></Tbc></p></div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="cta-band band">
        <div className="wrap">
          <h2><T k="ministries.ctaTitle" /></h2>
          <div className="btn-row">
            <Link className="btn btn-navy" to="/give"><T k="common.give" /></Link>
            <Link className="btn btn-light" to="/contact"><T k="ministries.volunteer" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
