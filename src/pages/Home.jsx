import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Seal from '../components/Seal.jsx';
import { ContactForm } from '../components/MessageForm.jsx';
import { ClipCard, GatherCards, MapCard, Photo, Quote, SectionHead, Tbc, usePhotoViewer } from '../components/ui.jsx';
import { CHURCH, CLIPS, img, video } from '../data.js';

function Hero() {
  const ref = useRef();
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    const v = ref.current;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setPlaying(false); return; }
    v.play()?.catch(() => setPlaying(false));
  }, []);
  const toggle = () => {
    const v = ref.current;
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };
  return (
    <section className="hero band">
      <img className="poster" src={img('hero-poster')} alt="" />
      <video ref={ref} muted loop playsInline preload="metadata" poster={img('hero-poster')} aria-hidden="true">
        <source src={video('hero')} type="video/mp4" />
      </video>
      <div className="in">
        <Seal className="seal-hero" size={180} label="Potter's House Outreach Ministries International seal" />
        <p className="eyebrow">{CHURCH.tagline}</p>
        <h1>Shaped by the Potter's Hand</h1>
        <p className="sub">{CHURCH.vision.replace(/^To transform/, 'Transforming')}</p>
        <p className="verse">“As the clay is in the potter's hand, so are ye in mine hand.” — Jeremiah 18:6</p>
        <div className="btn-row" style={{ justifyContent: 'center', marginTop: 8 }}>
          <Link className="btn btn-gold" to="/contact">Plan your visit</Link>
          <Link className="btn btn-light" to="/#story">Discover</Link>
        </div>
      </div>
      <button className="vid-toggle" type="button" onClick={toggle} aria-label={playing ? 'Pause background video' : 'Play background video'}>
        <Icon name={playing ? 'pause' : 'play'} size={18} />
      </button>
    </section>
  );
}

export default function Home() {
  const view = usePhotoViewer();
  return (
    <>
      <Hero />
      <div className="band">
        <div className="pillars">
          <Link to="/ministries?tab=worship"><Icon name="church" size={34} /><span>A Place to Worship</span></Link>
          <Link to="/prayer"><Icon name="heart" size={34} /><span>A House of Prayer</span></Link>
          <Link to="/ministries?tab=bible-study"><Icon name="book" size={34} /><span>Bible Study</span></Link>
          <Link to="/ministries?tab=outreach"><Icon name="globe" size={34} /><span>Outreach to the Needy</span></Link>
        </div>
      </div>

      <section className="sec band" id="story">
        <div className="wrap split">
          <div className="stack">
            <h2 className="h2">Where It All Began</h2>
            <div className="rule" />
            <p className="lead">
              Potter's House Outreach Ministries International (PHOMI) came into existence in response to God's leading, with a burden to preach the gospel to every creature.{' '}
              <Tbc>Founding year, founder, and how the ministry grew in Burweta, Butebo District</Tbc>
            </p>
            <p className="lead">
              Our name comes from Jeremiah 18, where God sends the prophet down to the potter's house to watch marred clay being made new. That is our story and our calling: ordinary lives, reshaped in the Master's hands, sent out to serve.
            </p>
            <div className="btn-row" style={{ marginTop: 8 }}>
              <Link className="btn btn-navy" to="/about">About us</Link>
              <Link className="btn btn-light" to="/about#build">See the church being built</Link>
            </div>
          </div>
          <div className="framed">
            <Photo name="church-tree" alt="The PHOMI church building at Burweta" />
            <span className="cap">Our church home in Burweta</span>
          </div>
        </div>
      </section>

      <section className="sec band tint">
        <div className="wrap stack center">
          <SectionHead title="Our Mission" gold lead="To preach the gospel of Jesus Christ, to sensitize and train individuals and communities, and to care for their physical and spiritual well-being." />
          <div className="objectives">
            {[
              ['Reach the Needy', 'To reach out to needy people as fully as we are able, wherever they are found.'],
              ['Support the Vulnerable', 'Through education, feeding, healthcare and accommodation, as James 1:27 calls us to do.'],
              ['Preach & Teach the Word', "To preach and teach God's word so that people live by it, through the church and our Bible studies."]
            ].map(([h, p], i) => (
              <div className="stack" style={{ gap: 10 }} key={h}>
                <span className="n">{i + 1}</span>
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="strip" aria-label="Life at PHOMI">
        {[['worship-outdoor', 'Worship'], ['children-crowd', 'Outreach'], ['class-room', 'Bible Study'], ['fellowship', 'Fellowship']].map(([n, l]) => (
          <button type="button" key={n} onClick={() => view(n)} aria-label={`View photo: ${l}`}>
            <Photo name={n} />
            <span className="lbl">{l}</span>
          </button>
        ))}
      </section>

      <Quote photo="crusade-field" text="Go ye into all the world, and preach the gospel to every creature." cite="Mark 16:15" />

      <section className="sec band">
        <div className="wrap stack" style={{ gap: 40 }}>
          <SectionHead title="Weekly Gatherings" gold lead="Everyone is welcome. Come as you are." />
          <GatherCards />
        </div>
      </section>

      <section className="sec band tint" style={{ paddingBlock: 88 }}>
        <div className="wrap stack" style={{ gap: 32 }}>
          <div className="searchrow" style={{ margin: 0 }}>
            <div className="stack" style={{ gap: 14 }}>
              <h2 className="h2">Moments from PHOMI</h2>
              <div className="rule" />
            </div>
            <Link className="btn btn-navy" to="/sermons">Watch more</Link>
          </div>
          <div className="clips">{CLIPS.slice(0, 3).map((c) => <ClipCard key={c.v} clip={c} />)}</div>
        </div>
      </section>

      <section className="cta-band band">
        <div className="wrap">
          <div className="stack" style={{ gap: 6 }}>
            <h2>Want to get involved?</h2>
            <p>Give, pray with us, or join an outreach mission.</p>
          </div>
          <div className="btn-row">
            <Link className="btn btn-navy" to="/give">Give</Link>
            <Link className="btn btn-light" to="/prayer">Send a prayer request</Link>
          </div>
        </div>
      </section>

      <section className="sec band">
        <div className="wrap two">
          <div className="stack">
            <h2 className="h2" style={{ fontSize: 34 }}>Send us a Message</h2>
            <ContactForm id="home" />
          </div>
          <div className="stack" style={{ gap: 20 }}>
            <MapCard />
            <div className="infolist">
              <span><strong>Visit:</strong> {CHURCH.address.join(' · ')}</span>
              <span><strong>Call:</strong> {CHURCH.phones.slice(0, 2).join(' · ')}</span>
              <span><strong>WhatsApp:</strong> {CHURCH.whatsapp}</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
