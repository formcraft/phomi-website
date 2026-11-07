import { Link } from 'react-router-dom';
import { Banner, Photo, Quote, SectionHead, Tbc, usePhotoViewer } from '../components/ui.jsx';
import { BUILD_STEPS, CHURCH, VALUES } from '../data.js';

export default function About() {
  const view = usePhotoViewer();
  const groups = [['POTTERS', VALUES.slice(0, 7)], ['HOUSE', VALUES.slice(7)]];
  return (
    <>
      <Banner photo="women-praise" eyebrow="Who we are" title="About PHOMI" crumb="About" />

      <section className="sec band">
        <div className="wrap split">
          <div className="framed"><Photo name="fellowship" alt="Members of PHOMI in fellowship" /></div>
          <div className="stack">
            <h2 className="h2">Our Story</h2>
            <div className="rule" />
            <p className="lead">
              Potter's House Outreach Ministries International came into existence in response to God's leading, with a burden to preach the gospel to all people (Mark 16:15) and to care for the vulnerable (James 1:27).
            </p>
            <p className="lead">
              <Tbc>The year PHOMI began, the founder's name, the first gatherings, and milestones such as starting Bible study and outreach</Tbc>
            </p>
            <p className="lead">Today we gather in Burweta, Butebo District, as a church family, studying God's word together and serving our community in spirit, mind and body.</p>
          </div>
        </div>
      </section>

      <section className="vm">
        <div className="v1 band"><p className="k">Our Vision</p><p className="t">{CHURCH.vision}</p></div>
        <div className="v2 band"><p className="k">Our Mission</p><p className="t">{CHURCH.mission}</p></div>
      </section>

      <section className="sec band">
        <div className="wrap stack" style={{ gap: 36 }}>
          <SectionHead title="Our Core Values" gold lead="Twelve values, one for each letter of our name, shape how we live and serve.">
            <p className="acro" aria-hidden="true"><span>POTTERS</span> <span>HOUSE</span></p>
          </SectionHead>
          <div className="vgroups">
            {groups.map(([word, list]) => (
              <div className="vgroup" key={word}>
                <h3 className="vword">{word}</h3>
                <div className="values">
                  {list.map(([l, w]) => (
                    <div className="val" key={w}><span className="L">{l}</span><span className="W">{w}</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec band tint" id="build">
        <div className="wrap stack" style={{ gap: 36 }}>
          <SectionHead title="Building God's House" lead="Brick by brick, the church at Burweta was raised by the hands of this congregation." />
          <div className="timeline">
            {BUILD_STEPS.map(([n, s, h, p]) => (
              <div className="tl" key={n}>
                <button type="button" onClick={() => view(n)} aria-label={`View photo: ${h}`}><Photo name={n} /></button>
                <span className="st">{s}</span>
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec band">
        <div className="wrap stack" style={{ gap: 36 }}>
          <SectionHead title="Our Leadership" gold />
          <div className="leaders">
            {['Senior Pastor / Founder', 'Bible Study Leader', 'Outreach Coordinator'].map((r) => (
              <div className="leader" key={r}>
                <div className="ph">Portrait to add</div>
                <h3><Tbc>Name</Tbc></h3>
                <p>{r}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Quote
        photo="service-elders"
        text="Pure religion and undefiled before God and the Father is this, To visit the fatherless and widows in their affliction, and to keep himself unspotted from the world."
        cite="James 1:27"
      />

      <section className="sec band">
        <div className="wrap stack center">
          <h2 className="h2">Come and worship with us this Sunday</h2>
          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-navy" to="/contact">Plan your visit</Link>
            <Link className="btn btn-light" to="/ministries">Our ministries</Link>
          </div>
        </div>
      </section>
    </>
  );
}
