import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';
import { CHURCH, TIMES } from '../data.js';
import { useLive } from '../live.jsx';
import { T, useT } from '../i18n.jsx';
import { PrayerWhen } from './ui.jsx';

// Visitor journeys: every page ends with the next steps that fit it, and the home page asks
// "How can we help you today?" so each kind of visitor finds their way in one tap.
const STEPS = {
  visit: ['/contact#visit', 'church'],
  prayer: ['/prayer', 'heart'],
  testimony: ['/testimonies#share-testimony', 'mic'],
  testimonies: ['/testimonies', 'users'],
  grow: ['/bible#bible-subscribe', 'mail'],
  bible: ['/bible', 'book'],
  watch: ['/sermons', 'play'],
  give: ['/give', 'gift'],
  ministries: ['/ministries', 'globe'],
  events: ['/events', 'clock'],
  gallery: ['/gallery', 'image'],
  contact: ['/contact', 'chat'],
};

const PAGE_STEPS = {
  '/about': ['visit', 'ministries', 'testimonies'],
  '/ministries': ['visit', 'events', 'prayer'],
  '/sermons': ['grow', 'testimonies', 'give'],
  '/bible': ['watch', 'prayer', 'testimonies'],
  '/events': ['visit', 'gallery', 'give'],
  '/gallery': ['testimonies', 'events', 'visit'],
  '/testimonies': ['prayer', 'visit', 'watch'],
  '/prayer': ['testimony', 'visit', 'grow'],
  '/give': ['testimonies', 'events', 'contact'],
  '/contact': ['prayer', 'watch', 'grow'],
};

function StepCard({ id }) {
  const [to, icon] = STEPS[id];
  return (
    <Link className="step" to={to} data-step={id}>
      <span className="step-ic"><Icon name={icon} size={24} /></span>
      <span className="step-tx">
        <b><T k={`step.${id}.t`} /></b>
        <small><T k={`step.${id}.p`} /></small>
      </span>
      <Icon name="right" size={18} />
    </Link>
  );
}

export function HelpChooser() {
  return (
    <section className="sec band help" aria-labelledby="help-title">
      <div className="wrap">
        <div className="stack center" style={{ marginBottom: 32 }}>
          <h2 className="h2" id="help-title"><T k="help.title" /></h2>
          <div className="rule gold" />
          <p className="lead"><T k="help.lead" /></p>
        </div>
        <div className="steps steps6">
          {['visit', 'prayer', 'testimony', 'grow', 'watch', 'give'].map((id) => <StepCard key={id} id={id} />)}
        </div>
      </div>
    </section>
  );
}

export function NextSteps() {
  const { pathname } = useLocation();
  const ids = PAGE_STEPS[pathname];
  if (!ids) return null;
  return (
    <section className="band next-steps" aria-labelledby="next-title">
      <div className="wrap">
        <h2 id="next-title"><T k="next.title" /></h2>
        <div className="steps">{ids.map((id) => <StepCard key={id} id={id} />)}</div>
      </div>
    </section>
  );
}

// Contact page: three simple steps for a first visit, with a ready-made "I'm coming" WhatsApp message
export function PlanVisit() {
  useLive();
  const t = useT();
  const msg = t('visit.waText');
  return (
    <section className="sec band plan" id="visit" aria-labelledby="visit-title">
      <div className="wrap">
        <div className="stack center" style={{ marginBottom: 32 }}>
          <p className="eyebrow" style={{ color: 'var(--accentText)' }}><T k="visit.eyebrow" /></p>
          <h2 className="h2" id="visit-title"><T k="common.planVisit" /></h2>
          <div className="rule gold" />
          <p className="lead"><T k="visit.lead" /></p>
        </div>
        <ol className="plan-steps">
          <li>
            <span className="n">1</span>
            <h3><T k="visit.when" /></h3>
            <p><T k="common.sundayService" /> · <T k="ministries.sundayTimes" /><br /><T k="common.prayerTime" /> · <PrayerWhen /> {TIMES.prayerTime}</p>
          </li>
          <li>
            <span className="n">2</span>
            <h3><T k="visit.where" /></h3>
            <p>{CHURCH.address[0]}<br /><a href="#map"><T k="visit.seeMap" /></a></p>
          </li>
          <li>
            <span className="n">3</span>
            <h3><T k="visit.tell" /></h3>
            <p><T k="visit.tellText" /></p>
            <a className="btn btn-gold" href={`https://wa.me/${CHURCH.whatsappDigits}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={18} /> <T k="visit.tellBtn" /></a>
          </li>
        </ol>
        <p className="plan-expect"><T k="visit.expect" /></p>
      </div>
    </section>
  );
}
