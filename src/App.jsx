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

function NotFound() {
  return (
    <section className="sec band">
      <div className="wrap stack center">
        <h1 className="h2">Page not found</h1>
        <p className="lead">The page you were looking for has moved or no longer exists.</p>
        <Link className="btn btn-navy" to="/">Go to the home page</Link>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <OverlayProvider>
      <Title />
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
