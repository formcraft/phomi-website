import Icon from '../components/Icon.jsx';
import { ContactForm } from '../components/MessageForm.jsx';
import { Banner, CopyButton, MapCard, PrayerWhen, Tbc } from '../components/ui.jsx';
import { CHURCH, TIMES } from '../data.js';
import { useLive } from '../live.jsx';

export default function Contact() {
  useLive();
  return (
    <>
      <Banner photo="church-front" eyebrow="You are welcome here" title="Contact & Visit" crumb="Contact" />
      <section className="sec band">
        <div className="wrap cards4">
          <div className="ccard">
            <div className="ic"><Icon name="pin" size={22} /></div>
            <h2>Visit</h2>
            <p>{CHURCH.address[0]}<br />{CHURCH.address[1]}</p>
          </div>
          <div className="ccard">
            <div className="ic"><Icon name="phone" size={22} /></div>
            <h2>Call</h2>
            <p>{CHURCH.phones.map((p) => <a key={p} href={`tel:${p.replace(/\s/g, '')}`} style={{ display: 'block' }}>{p}</a>)}</p>
            <span className="copyrow"><CopyButton text={CHURCH.phones[0].replace(/\s/g, '')} label="main number">Copy main number</CopyButton></span>
          </div>
          <div className="ccard">
            <div className="ic"><Icon name="chat" size={22} /></div>
            <h2>WhatsApp</h2>
            <p><a href={`https://wa.me/${CHURCH.whatsappDigits}`} target="_blank" rel="noopener noreferrer">{CHURCH.whatsapp}</a></p>
            <span className="copyrow"><CopyButton text={CHURCH.whatsapp.replace(/\s/g, '')} label="WhatsApp number" /></span>
          </div>
          <div className="ccard">
            <div className="ic"><Icon name="mail" size={22} /></div>
            <h2>Email</h2>
            <p className="email"><a href={`mailto:${CHURCH.email}`}>{CHURCH.email}</a></p>
            <span className="copyrow"><CopyButton text={CHURCH.email} label="email address" /></span>
          </div>
        </div>
      </section>
      <section className="band" style={{ paddingBlock: '0 96px' }}>
        <div className="wrap two">
          <div className="stack">
            <h2 className="h2" style={{ fontSize: 34 }}>Send us a Message</h2>
            <ContactForm id="contact" button="Send message" />
          </div>
          <div className="stack" style={{ gap: 20 }}>
            <MapCard />
            <div className="infolist">
              <strong>Service times</strong>
              <span>Sunday Service · 8:30am – 12:00pm</span>
              <span>Prayer Time · <PrayerWhen /> {TIMES.prayerTime}</span>
              <span><Tbc>Directions: distance from Mbale town and a nearby landmark</Tbc></span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
