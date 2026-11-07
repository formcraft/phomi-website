import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';
import Seal from './Seal.jsx';
import { CHURCH, NAV } from '../data.js';

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
  useEffect(() => setOpen(false), [pathname]);
  const links = NAV.map(([to, label]) => (
    <NavLink key={to} to={to} end={to === '/'} className="nl">
      {label}
    </NavLink>
  ));
  return (
    <header className="site">
      <div className="hdr-top">
        <Link className="brand" to="/" aria-label="Potter's House home">
          <Seal size={64} />
          <span className="brand-name">
            <b>Potter's House</b>
            <small>Outreach Ministries International</small>
          </span>
        </Link>
        <div className="hdr-info">
          <span className="addr">
            <Icon name="pin" size={18} style={{ color: 'var(--clay)' }} />
            <span>Burweta, Butebo District<br />P.O. Box 1972, Mbale</span>
          </span>
          <Link className="hdr-call" to="/contact">
            <Icon name="phone" size={16} />
            {CHURCH.phones[0]}
          </Link>
        </div>
        <button className="menu-btn" type="button" aria-expanded={open} aria-controls="mnav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>
          <Icon name={open ? 'close' : 'menu'} size={28} />
        </button>
      </div>
      <nav className="main" aria-label="Main">
        <div className="in">
          {links}
          <Link className="give-pill" to="/give">Give</Link>
        </div>
      </nav>
      <nav className="mnav" id="mnav" aria-label="Main" hidden={!open}>
        {links}
        <Link className="btn btn-gold" to="/give">Give</Link>
        <small>Burweta, Butebo District · {CHURCH.phones[0]}</small>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site">
      <div className="cols">
        <div className="c1">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Seal size={96} label="PHOMI seal" />
            <span className="ftr-name">Potter's House Outreach<br />Ministries International</span>
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, maxWidth: 360 }}>
            {CHURCH.tagline}. Transforming the spiritual, physical, intellectual, social and economic lives of our community through the gospel of Jesus Christ.
          </p>
          <div className="soc">
            <a href={CHURCH.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Icon name="facebook" size={18} /></a>
            <a href={`https://wa.me/${CHURCH.whatsappDigits}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><Icon name="chat" size={18} /></a>
            {CHURCH.tiktok && <a href={CHURCH.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"><Icon name="video" size={18} /></a>}
            {CHURCH.instagram && <a href={CHURCH.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Icon name="instagram" size={18} /></a>}
          </div>
        </div>
        <div className="c">
          <h2>Explore</h2>
          <Link to="/about">About us</Link>
          <Link to="/ministries">Ministries</Link>
          <Link to="/sermons">Sermons</Link>
          <Link to="/events">Events</Link>
          <Link to="/gallery">Gallery</Link>
        </div>
        <div className="c">
          <h2>Get involved</h2>
          <Link to="/give">Give</Link>
          <Link to="/prayer">Prayer requests</Link>
          <Link to="/ministries?tab=outreach">Join an outreach</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div className="c" style={{ flexBasis: 220 }}>
          <h2>Visit us</h2>
          <span>{CHURCH.address[0]}<br />{CHURCH.address[1]}</span>
          <span>{CHURCH.phones.map((p) => <span key={p} style={{ display: 'block' }}>{p}</span>)}</span>
          <span className="email">{CHURCH.email}</span>
          <span>Sundays 8:30am – 12:00pm</span>
        </div>
      </div>
      <div className="base">
        <div className="in">
          <span>© {new Date().getFullYear()} {CHURCH.name}</span>
          <span>Jeremiah 18:6</span>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <ScrollManager />
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
