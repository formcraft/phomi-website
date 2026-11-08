import { lazy, Suspense, useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { OverlayProvider } from './components/Overlay.jsx';
import Home from './pages/Home.jsx';
import { PAGE_LOADERS, warmPages, warmPath } from './pages/loaders.js';
import { pageMeta } from './seo.js';
import { setHead } from './head.js';
import { T } from './i18n.jsx';

const Admin = lazy(() => import('./admin/Admin.jsx'));
// Each page's code loads on its own, so the first visit downloads only what that page needs.
// Once the page is showing, the other pages load quietly in the background (see warmPages).
const page = Object.fromEntries(Object.entries(PAGE_LOADERS).map(([k, load]) => [k, lazy(load)]));

function Warm() {
  useEffect(() => {
    warmPages();
    const onPoint = (e) => {
      const a = e.target.closest?.('a[href^="/"]');
      if (a) warmPath(a.getAttribute('href'));
    };
    document.addEventListener('pointerover', onPoint, { passive: true });
    document.addEventListener('touchstart', onPoint, { passive: true });
    return () => { document.removeEventListener('pointerover', onPoint); document.removeEventListener('touchstart', onPoint); };
  }, []);
  return null;
}

// While a page's code arrives (only on a slow first visit), keep the space so nothing jumps
const Wait = ({ children }) => <Suspense fallback={<div className="page-wait" aria-busy="true" />}>{children}</Suspense>;

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
      <Warm />
      <Routes>
        <Route path="admin/*" element={<Suspense fallback={<p style={{ padding: 32 }}>Loading…</p>}><Admin /></Suspense>} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          {Object.entries(page).map(([path, P]) => <Route key={path} path={path} element={<Wait><P /></Wait>} />)}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </OverlayProvider>
  );
}
