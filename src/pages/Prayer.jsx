import { PrayerForm } from '../components/MessageForm.jsx';
import { Banner, Photo, PrayerWhen } from '../components/ui.jsx';
import { CHURCH, TIMES } from '../data.js';
import { useLive } from '../live.jsx';
import { T, useT } from '../i18n.jsx';

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
    </>
  );
}
