import Icon from '../components/Icon.jsx';
import { ContactForm } from '../components/MessageForm.jsx';
import { Banner, CopyButton, MapCard, PrayerWhen, Tbc } from '../components/ui.jsx';
import { CHURCH, TIMES } from '../data.js';
import { useLive } from '../live.jsx';
import { T, useT } from '../i18n.jsx';

export default function Contact() {
  useLive();
  const t = useT();
  return (
    <>
      <Banner photo="church-front" eyebrow={<T k="contact.eyebrow" />} title={<T k="contact.title" />} crumb={<T k="contact.crumb" />} />
      <section className="sec band">
        <div className="wrap cards4">
          <div className="ccard">
            <div className="ic"><Icon name="pin" size={22} /></div>
            <h2><T k="contact.visit" /></h2>
            <p>{CHURCH.address[0]}<br />{CHURCH.address[1]}</p>
          </div>
          <div className="ccard">
            <div className="ic"><Icon name="phone" size={22} /></div>
            <h2><T k="contact.call" /></h2>
            <p>{CHURCH.phones.map((p) => <a key={p} href={`tel:${p.replace(/\s/g, '')}`} style={{ display: 'block' }}>{p}</a>)}</p>
            <span className="copyrow"><CopyButton text={CHURCH.phones[0].replace(/\s/g, '')} label={t('contact.mainNumber')}><T k="contact.copyMain" /></CopyButton></span>
          </div>
          <div className="ccard">
            <div className="ic"><Icon name="chat" size={22} /></div>
            <h2><T k="contact.whatsapp" /></h2>
            <p><a href={`https://wa.me/${CHURCH.whatsappDigits}`} target="_blank" rel="noopener noreferrer">{CHURCH.whatsapp}</a></p>
            <span className="copyrow"><CopyButton text={CHURCH.whatsapp.replace(/\s/g, '')} label="WhatsApp" /></span>
          </div>
          <div className="ccard">
            <div className="ic"><Icon name="mail" size={22} /></div>
            <h2><T k="contact.email" /></h2>
            <p className="email"><a href={`mailto:${CHURCH.email}`}>{CHURCH.email}</a></p>
            <span className="copyrow"><CopyButton text={CHURCH.email} label="Email" /></span>
          </div>
        </div>
      </section>
      <section className="band" style={{ paddingBlock: '0 96px' }}>
        <div className="wrap two">
          <div className="stack">
            <h2 className="h2" style={{ fontSize: 34 }}><T k="contact.messageTitle" /></h2>
            <ContactForm id="contact" button={t('form.sendMessage')} />
          </div>
          <div className="stack" style={{ gap: 20 }}>
            <MapCard />
            <div className="infolist">
              <strong><T k="contact.times" /></strong>
              <span><T k="common.sundayService" /> · <T k="ministries.sundayTimes" /></span>
              <span><T k="common.prayerTime" /> · <PrayerWhen /> {TIMES.prayerTime}</span>
              <span><Tbc><T k="contact.directionsTbc" /></Tbc></span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
