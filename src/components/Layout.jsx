import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';
import Seal from './Seal.jsx';
import { CHURCH, NAV, TIMES } from '../data.js';
import { useLive } from '../live.jsx';
import { LangToggle, T, useT } from '../i18n.jsx';

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 40);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
    return undefined;
  }, [pathname, hash]);
  return null;
}

function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const t = useT();
  useEffect(() => setOpen(false), [pathname]);
  const links = NAV.map(([to, , key]) => (
    <NavLink key={to} to={to} end={to === '/'} className="nl">
      <T k={key} />
    </NavLink>
  ));
  return (
    <header className="site">
      <div className="hdr-top">
        <Link className="brand" to="/" aria-label={t('header.home')}>
          <Seal size={64} />
          <span className="brand-name">
            <b><T k="header.name1" /></b>
            <small><T k="header.name2" /></small>
          </span>
        </Link>
        <div className="hdr-info">
          <span className="addr">
            <Icon name="pin" size={18} style={{ color: 'var(--clay)' }} />
            <span><T k="header.addr1" /><br /><T k="header.addr2" /></span>
          </span>
          <Link className="hdr-call" to="/contact">
            <Icon name="phone" size={16} />
            {CHURCH.phones[0]}
          </Link>
        </div>
        <LangToggle className="langbtn langbtn-phone" />
        <button className="menu-btn" type="button" aria-expanded={open} aria-controls="mnav" aria-label={open ? t('header.menuClose') : t('header.menuOpen')} onClick={() => setOpen(!open)}>
          <Icon name={open ? 'close' : 'menu'} size={28} />
        </button>
      </div>
      <nav className="main" aria-label="Main">
        <div className="in">
          {links}
          <LangToggle className="langbtn langbtn-nav" />
          <Link className="give-pill" to="/give"><T k="nav.give" /></Link>
        </div>
      </nav>
      <nav className="mnav" id="mnav" aria-label="Main" hidden={!open}>
        {links}
        <Link className="btn btn-gold" to="/give"><T k="nav.give" /></Link>
        <small><T k="header.addr1" /> · {CHURCH.phones[0]}</small>
      </nav>
    </header>
  );
}

function Footer() {
  useLive();
  const t = useT();
  return (
    <footer className="site">
      <div className="cols">
        <div className="c1">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Seal size={96} label={t('footer.seal')} />
            <span className="ftr-name">Potter's House Outreach<br />Ministries International</span>
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, maxWidth: 360 }}>
            <T k="footer.about" />
          </p>
          <div className="soc">
            <a href={CHURCH.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Icon name="facebook" size={18} /></a>
            <a href={`https://wa.me/${CHURCH.whatsappDigits}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><Icon name="chat" size={18} /></a>
            {CHURCH.youtube && <a href={CHURCH.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Icon name="video" size={18} /></a>}
            {CHURCH.tiktok && <a href={CHURCH.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"><Icon name="tiktok" size={18} /></a>}
            {CHURCH.instagram && <a href={CHURCH.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Icon name="instagram" size={18} /></a>}
          </div>
        </div>
        <div className="c">
          <h2><T k="footer.explore" /></h2>
          <Link to="/about"><T k="footer.aboutUs" /></Link>
          <Link to="/ministries"><T k="nav.ministries" /></Link>
          <Link to="/sermons"><T k="nav.sermons" /></Link>
          <Link to="/bible"><T k="footer.readBible" /></Link>
          <Link to="/events"><T k="nav.events" /></Link>
          <Link to="/gallery"><T k="nav.gallery" /></Link>
        </div>
        <div className="c">
          <h2><T k="footer.involved" /></h2>
          <Link to="/give"><T k="nav.give" /></Link>
          <Link to="/prayer"><T k="nav.prayer" /></Link>
          <Link to="/bible#bible-subscribe"><T k="footer.dailyVerse" /></Link>
          {CHURCH.whatsappChannel && <a href={CHURCH.whatsappChannel} target="_blank" rel="noopener noreferrer"><T k="footer.channel" /></a>}
          <Link to="/ministries?tab=outreach"><T k="footer.outreach" /></Link>
          <Link to="/contact"><T k="nav.contact" /></Link>
        </div>
        <div className="c" style={{ flexBasis: 220 }}>
          <h2><T k="footer.visit" /></h2>
          <span>{CHURCH.address[0]}<br />{CHURCH.address[1]}</span>
          <span>{CHURCH.phones.map((p) => <span key={p} style={{ display: 'block' }}>{p}</span>)}</span>
          <span className="email">{CHURCH.email}</span>
          <span>{t.days(TIMES.sunday.replace(/^Every /, ''))}</span>
        </div>
      </div>
      <div className="base">
        <div className="in">
          <span>© {new Date().getFullYear()} {CHURCH.name}</span>
          <span>{t.lang === 'lg' ? 'Yeremiya 18:6' : 'Jeremiah 18:6'}</span>
        </div>
      </div>
    </footer>
  );
}

// The newest announcement from the admin page or the update mailbox, shown above every page.
function NewsBar() {
  const { announcements } = useLive();
  const t = useT();
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem('phomi-news-hide') || ''; } catch { return ''; }
  });
  const a = announcements[0];
  if (!a || hidden === String(a.id)) return null;
  const close = () => {
    setHidden(String(a.id));
    try { sessionStorage.setItem('phomi-news-hide', String(a.id)); } catch { /* ignore */ }
  };
  return (
    <div className="newsbar band" role="region" aria-label={t('header.news')}>
      <div className="in">
        <Icon name="bell" size={18} />
        <p><strong>{a.title}</strong>{a.body ? <span> {a.body}</span> : null}</p>
        {a.link && <a href={a.link} target="_blank" rel="noopener noreferrer"><T k="header.newsMore" /></a>}
        <button type="button" onClick={close} aria-label={t('header.newsHide')}><Icon name="close" size={16} /></button>
      </div>
    </div>
  );
}

export default function Layout() {
  return (
    <>
      <a className="skip" href="#main"><T k="header.skip" /></a>
      <ScrollManager />
      <NewsBar />
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
