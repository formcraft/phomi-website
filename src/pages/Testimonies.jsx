import { Link } from 'react-router-dom';
import { Banner } from '../components/ui.jsx';
import { TestimonyForm, TestimonyGallery } from '../components/Testimonies.jsx';
import { useLive } from '../live.jsx';
import { T } from '../i18n.jsx';

export default function Testimonies() {
  useLive();
  return (
    <>
      <Banner photo="celebration" eyebrow={<T k="testi.eyebrow" />} title={<T k="testi.title" />}>
        <p className="crumb" style={{ fontFamily: 'var(--head)', fontStyle: 'italic', fontSize: 17, color: 'var(--accentLight)' }}><T k="testi.verse" /></p>
      </Banner>
      <section className="sec band tst-sec" id="testimonies">
        <div className="wrap">
          <div className="stack center tst-head">
            <p className="lead"><T k="testi.lead" /></p>
            <div className="btn-row" style={{ justifyContent: 'center' }}>
              <a className="btn btn-gold" href="#share-testimony"><T k="testi.jump" /></a>
              <Link className="btn btn-light" to="/prayer"><T k="testi.needPrayer" /></Link>
            </div>
          </div>
          <TestimonyGallery />
        </div>
      </section>
      <section className="sec band" id="share-testimony">
        <div className="wrap tst-share">
          <div className="stack">
            <h2 className="h2"><T k="testi.formTitle" /></h2>
            <div className="rule" />
            <p className="lead"><T k="testi.formLead" /></p>
          </div>
          <div className="tst-formcard"><TestimonyForm /></div>
        </div>
      </section>
    </>
  );
}
