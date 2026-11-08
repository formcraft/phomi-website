import { Link } from 'react-router-dom';
import { Banner, Photo, Quote, SectionHead, Tbc, usePhotoViewer } from '../components/ui.jsx';
import { BUILD_STEPS, VALUES } from '../data.js';
import { T, useT } from '../i18n.jsx';

export default function About() {
  const view = usePhotoViewer();
  const t = useT();
  const values = VALUES.map(([l], i) => [l, i]);
  const groups = [['POTTERS', values.slice(0, 7)], ['HOUSE', values.slice(7)]];
  return (
    <>
      <Banner photo="women-praise" eyebrow={<T k="about.eyebrow" />} title={<T k="about.title" />} crumb={<T k="about.crumb" />} />

      <section className="sec band">
        <div className="wrap split">
          <div className="framed"><Photo name="fellowship" alt={t('about.fellowshipPhoto')} /></div>
          <div className="stack">
            <h2 className="h2"><T k="about.storyTitle" /></h2>
            <div className="rule" />
            <p className="lead"><T k="about.story1" /></p>
            <p className="lead">
              <Tbc><T k="about.storyTbc" /></Tbc>
            </p>
            <p className="lead"><T k="about.story2" /></p>
          </div>
        </div>
      </section>

      <section className="vm">
        <div className="v1 band"><p className="k"><T k="about.vision" /></p><p className="t"><T k="about.visionText" /></p></div>
        <div className="v2 band"><p className="k"><T k="about.mission" /></p><p className="t"><T k="about.missionText" /></p></div>
      </section>

      <section className="sec band">
        <div className="wrap stack" style={{ gap: 36 }}>
          <SectionHead title={<T k="about.valuesTitle" />} gold lead={<T k="about.valuesLead" />}>
            <p className="acro" aria-hidden="true"><span>POTTERS</span> <span>HOUSE</span></p>
          </SectionHead>
          <div className="vgroups">
            {groups.map(([word, list]) => (
              <div className="vgroup" key={word}>
                <h3 className="vword">{word}</h3>
                <div className="values">
                  {list.map(([l, i]) => (
                    <div className="val" key={i}><span className="L">{l}</span><span className="W"><T k={`value.${i}`} /></span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec band tint" id="build">
        <div className="wrap stack" style={{ gap: 36 }}>
          <SectionHead title={<T k="about.buildTitle" />} lead={<T k="about.buildLead" />} />
          <div className="timeline">
            {BUILD_STEPS.map(([n], i) => (
              <div className="tl" key={n}>
                <button type="button" onClick={() => view(n)} aria-label={t('common.viewPhoto', { name: t(`build.${i}.title`) })}><Photo name={n} /></button>
                <span className="st"><T k={`build.${i}.step`} /></span>
                <h3><T k={`build.${i}.title`} /></h3>
                <p><T k={`build.${i}.text`} /></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec band">
        <div className="wrap stack" style={{ gap: 36 }}>
          <SectionHead title={<T k="about.leadersTitle" />} gold />
          <div className="leaders">
            {['about.leader1', 'about.leader2', 'about.leader3'].map((r) => (
              <div className="leader" key={r}>
                <div className="ph"><T k="about.portrait" /></div>
                <h3><Tbc><T k="about.name" /></Tbc></h3>
                <p><T k={r} /></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Quote photo="service-elders" text={<T k="about.quote" />} cite={<T k="about.quoteCite" />} />

      <section className="sec band">
        <div className="wrap stack center">
          <h2 className="h2"><T k="about.ctaTitle" /></h2>
          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-navy" to="/contact"><T k="common.planVisit" /></Link>
            <Link className="btn btn-light" to="/ministries"><T k="about.ctaMinistries" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
