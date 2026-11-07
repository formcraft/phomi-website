import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Seal from '../components/Seal.jsx';
import { ContactForm } from '../components/MessageForm.jsx';
import { ClipCard, GatherCards, useClips, MapCard, Photo, Quote, SectionHead, Tbc, usePhotoViewer } from '../components/ui.jsx';
import { CHURCH, img, video } from '../data.js';
import { Subscribe, VerseCard } from '../components/Verse.jsx';
import { useLive } from '../live.jsx';
import { T, useT } from '../i18n.jsx';

// Phones get a 1 MB copy of the background video. With Data Saver on, or on a slow connection,
// the video doesn't load at all until the visitor presses play.
const phone = () => window.matchMedia?.('(max-width: 760px)').matches;
const saveData = () => { const c = navigator.connection; return !!c && (c.saveData || /(^|-)2g|3g/.test(c.effectiveType || '')); };

function Hero() {
  const t = useT();
  const ref = useRef();
  const [playing, setPlaying] = useState(true);
  const [src, setSrc] = useState(null);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const pick = video(phone() ? 'hero-sm' : 'hero');
    if (reduce || saveData()) { setPlaying(false); ref.current.dataset.src = pick; return; }
    setSrc(pick);
  }, []);
  useEffect(() => { if (src) ref.current.play()?.catch(() => setPlaying(false)); }, [src]);
  const toggle = () => {
    const v = ref.current;
    if (!src && v.dataset.src) { setSrc(v.dataset.src); setPlaying(true); return; }
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };
  return (
    <section className="hero band">
      <img className="poster" src={img('hero-poster')} alt="" />
      <video ref={ref} muted loop playsInline preload="none" poster={img('hero-poster')} aria-hidden="true" src={src || undefined} />
      <div className="in">
        <Seal className="seal-hero" size={180} label={t('home.sealLabel')} />
        <p className="eyebrow"><T k="home.tagline" /></p>
        <h1><T k="home.heroTitle" /></h1>
        <p className="sub"><T k="home.heroSub" /></p>
        <p className="verse"><T k="home.heroVerse" /></p>
        <div className="btn-row" style={{ justifyContent: 'center', marginTop: 8 }}>
          <Link className="btn btn-gold" to="/contact"><T k="common.planVisit" /></Link>
          <Link className="btn btn-light" to="/#story"><T k="home.discover" /></Link>
        </div>
      </div>
      <button className="vid-toggle" type="button" onClick={toggle} aria-label={playing ? t('common.pauseVideo') : t('common.playVideo')}>
        <Icon name={playing ? 'pause' : 'play'} size={18} />
      </button>
    </section>
  );
}

export default function Home() {
  const clips = useClips();
  const view = usePhotoViewer();
  const { verse, verse_lg: verseLg } = useLive();
  const t = useT();
  const v = t.lang === 'lg' && verseLg?.day?.text ? verseLg : verse;
  return (
    <>
      <Hero />
      <div className="band">
        <div className="pillars">
          <Link to="/ministries?tab=worship"><Icon name="church" size={34} /><span><T k="home.pillarWorship" /></span></Link>
          <Link to="/prayer"><Icon name="heart" size={34} /><span><T k="home.pillarPrayer" /></span></Link>
          <Link to="/ministries?tab=bible-study"><Icon name="book" size={34} /><span><T k="home.pillarStudy" /></span></Link>
          <Link to="/ministries?tab=outreach"><Icon name="globe" size={34} /><span><T k="home.pillarOutreach" /></span></Link>
        </div>
      </div>
      {v?.day?.text && (
        <section className="sec band verse-home" aria-label={t('home.verseSection')}>
          <div className="wrap verse-home-in">
            <VerseCard v={v.day} />
            <Subscribe id="home-subscribe" title={t('home.everyMorning')} />
          </div>
        </section>
      )}

      <section className="sec band" id="story">
        <div className="wrap split">
          <div className="stack">
            <h2 className="h2"><T k="home.storyTitle" /></h2>
            <div className="rule" />
            <p className="lead">
              <T k="home.story1" />{' '}
              <Tbc><T k="home.storyTbc" /></Tbc>
            </p>
            <p className="lead"><T k="home.story2" /></p>
            <div className="btn-row" style={{ marginTop: 8 }}>
              <Link className="btn btn-navy" to="/about"><T k="home.aboutUs" /></Link>
              <Link className="btn btn-light" to="/about#build"><T k="home.seeBuild" /></Link>
            </div>
          </div>
          <div className="framed">
            <Photo name="church-tree" alt={t('home.churchPhoto')} />
            <span className="cap"><T k="home.churchCap" /></span>
          </div>
        </div>
      </section>

      <section className="sec band tint">
        <div className="wrap stack center">
          <SectionHead title={<T k="home.missionTitle" />} gold lead={<T k="home.missionLead" />} />
          <div className="objectives">
            {['home.obj1', 'home.obj2', 'home.obj3'].map((k, i) => (
              <div className="stack" style={{ gap: 10 }} key={k}>
                <span className="n">{i + 1}</span>
                <h3><T k={k} /></h3>
                <p><T k={k + 'p'} /></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="strip" aria-label={t('home.lifeAt')}>
        {[['worship-outdoor', 'home.stripWorship'], ['children-crowd', 'home.stripOutreach'], ['class-room', 'home.stripStudy'], ['fellowship', 'home.stripFellowship']].map(([n, k]) => (
          <button type="button" key={n} onClick={() => view(n)} aria-label={t('common.viewPhoto', { name: t(k) })}>
            <Photo name={n} />
            <span className="lbl"><T k={k} /></span>
          </button>
        ))}
      </section>

      <Quote photo="crusade-field" text={<T k="home.quote" />} cite={<T k="home.quoteCite" />} />

      <section className="sec band">
        <div className="wrap stack" style={{ gap: 40 }}>
          <SectionHead title={<T k="home.gatherTitle" />} gold lead={<T k="home.gatherLead" />} />
          <GatherCards />
        </div>
      </section>

      <section className="sec band tint" style={{ paddingBlock: 88 }}>
        <div className="wrap stack" style={{ gap: 32 }}>
          <div className="searchrow" style={{ margin: 0 }}>
            <div className="stack" style={{ gap: 14 }}>
              <h2 className="h2"><T k="home.moments" /></h2>
              <div className="rule" />
            </div>
            <Link className="btn btn-navy" to="/sermons"><T k="home.watchMore" /></Link>
          </div>
          <div className="clips">{clips.slice(0, 3).map((c) => <ClipCard key={c.key} clip={c} list={clips} />)}</div>
        </div>
      </section>

      <section className="cta-band band">
        <div className="wrap">
          <div className="stack" style={{ gap: 6 }}>
            <h2><T k="home.ctaTitle" /></h2>
            <p><T k="home.ctaText" /></p>
          </div>
          <div className="btn-row">
            <Link className="btn btn-navy" to="/give"><T k="common.give" /></Link>
            <Link className="btn btn-light" to="/prayer"><T k="home.ctaPrayer" /></Link>
          </div>
        </div>
      </section>

      <section className="sec band">
        <div className="wrap two">
          <div className="stack">
            <h2 className="h2" style={{ fontSize: 34 }}><T k="home.messageTitle" /></h2>
            <ContactForm id="home" />
          </div>
          <div className="stack" style={{ gap: 20 }}>
            <MapCard />
            <div className="infolist">
              <span><strong><T k="home.visit" /></strong> {CHURCH.address.join(' · ')}</span>
              <span><strong><T k="home.call" /></strong> {CHURCH.phones.slice(0, 2).join(' · ')}</span>
              <span><strong><T k="home.whatsapp" /></strong> {CHURCH.whatsapp}</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
