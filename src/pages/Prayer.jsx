import { PrayerForm } from '../components/MessageForm.jsx';
import { Banner, Photo, PrayerWhen } from '../components/ui.jsx';
import { CHURCH, TIMES } from '../data.js';
import { useLive } from '../live.jsx';

export default function Prayer() {
  useLive();
  return (
    <>
      <Banner photo="kneeling-prayer" eyebrow="We will pray with you" title="Prayer Requests">
        <p className="crumb" style={{ fontFamily: 'var(--head)', fontStyle: 'italic', fontSize: 17, color: 'var(--accentLight)' }}>“Pray one for another.” — James 5:16</p>
      </Banner>
      <section className="sec band">
        <div className="wrap two">
          <div className="stack">
            <h2 className="h2">Share your need</h2>
            <div className="rule" />
            <p className="lead">Whatever you are facing, you are not alone. Our prayer team prays over every request during our prayer time.</p>
            <div className="times">
              <strong>Join us in prayer</strong>
              <span><PrayerWhen /> · {TIMES.prayerTime} at PHOMI, Burweta</span>
              <span>Or message us on WhatsApp: <b>{CHURCH.whatsapp}</b></span>
            </div>
            <div className="framed" style={{ minHeight: 280 }}><Photo name="service-prayer" alt="Prayer over a member of the church" /></div>
          </div>
          <div><PrayerForm /></div>
        </div>
      </section>
    </>
  );
}
