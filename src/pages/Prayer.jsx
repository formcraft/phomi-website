import { PrayerForm } from '../components/MessageForm.jsx';
import { Banner, Photo, PrayerWhen } from '../components/ui.jsx';
import { CHURCH, TIMES } from '../data.js';
import { useLive } from '../live.jsx';
import { T, useT } from '../i18n.jsx';
import { Link } from 'react-router-dom';

export default function Prayer() {
  useLive();
  const t = useT();
  return (
    <>
      <Banner photo="kneeling-prayer" eyebrow={<T k="prayer.eyebrow" />} title={<T k="prayer.title" />}>
        <p className="crumb" style={{ fontFamily: 'var(--head)', fontStyle: 'italic', fontSize: 17, color: 'var(--accentLight)' }}><T k="prayer.verse" /></p>
      </Banner>
      <section className="sec band">
        <div className="wrap two">
          <div className="stack">
            <h2 className="h2"><T k="prayer.shareTitle" /></h2>
            <div className="rule" />
            <p className="lead"><T k="prayer.shareText" /></p>
            <div className="times">
              <strong><T k="prayer.join" /></strong>
              <span><PrayerWhen /> · {TIMES.prayerTime} <T k="prayer.at" /></span>
              <span><T k="prayer.orWhatsapp" /> <b>{CHURCH.whatsapp}</b></span>
            </div>
            <div className="framed" style={{ minHeight: 280 }}><Photo name="service-prayer" alt={t('prayer.photo')} /></div>
          </div>
          <div><PrayerForm /></div>
        </div>
      </section>
      <section className="cta-band band">
        <div className="wrap">
          <div className="stack" style={{ gap: 6 }}>
            <h2><T k="prayer.answeredTitle" /></h2>
            <p><T k="prayer.answeredText" /></p>
          </div>
          <div className="btn-row">
            <Link className="btn btn-navy" to="/testimonies#share-testimony"><T k="testi.jump" /></Link>
            <Link className="btn btn-light" to="/testimonies"><T k="prayer.readTestimonies" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
