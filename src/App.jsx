import { lazy, Suspense, useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { OverlayProvider } from './components/Overlay.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Ministries from './pages/Ministries.jsx';
import Sermons from './pages/Sermons.jsx';
import Bible from './pages/Bible.jsx';
import Events from './pages/Events.jsx';
import Gallery from './pages/Gallery.jsx';
import Prayer from './pages/Prayer.jsx';
import Give from './pages/Give.jsx';
import Contact from './pages/Contact.jsx';
import { pageMeta } from './seo.js';
import { setHead } from './head.js';
import { T } from './i18n.jsx';

const Admin = lazy(() => import('./admin/Admin.jsx'));

function Title() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith('/admin')) return; // the admin page sets its own title and noindex
    if (pathname === '/bible') return; // the Bible page names the verse being read
    const known = pageMeta(pathname);
    setHead({ path: pathname, ...(known ? {} : { title: "Page not found | Potter's House", noindex: true }) });
  }, [pathname]);
  return null;
}

// Every link to another website opens in a new tab, so visitors keep the church site open.
// The links on the site already say so; this also catches links typed into content later.
function OffsiteLinks() {
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest?.('a[href]');
      if (!a || a.target) return;
      let u;
      try { u = new URL(a.href, window.location.href); } catch { return; }
      if (!/^https?:$/.test(u.protocol) || u.host === window.location.host) return;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  return null;
}

function NotFound() {
  return (
    <section className="sec band">
      <div className="wrap stack center">
        <h1 className="h2"><T k="common.notFound" /></h1>
        <p className="lead"><T k="common.notFoundText" /></p>
        <Link className="btn btn-navy" to="/"><T k="common.goHome" /></Link>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <OverlayProvider>
      <Title />
      <OffsiteLinks />
      <Routes>
        <Route path="admin/*" element={<Suspense fallback={<p style={{ padding: 32 }}>Loading…</p>}><Admin /></Suspense>} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="ministries" element={<Ministries />} />
          <Route path="sermons" element={<Sermons />} />
          <Route path="bible" element={<Bible />} />
          <Route path="events" element={<Events />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="prayer" element={<Prayer />} />
          <Route path="give" element={<Give />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </OverlayProvider>
  );
}
