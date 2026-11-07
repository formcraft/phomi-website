import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { OverlayProvider } from './components/Overlay.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Ministries from './pages/Ministries.jsx';
import Sermons from './pages/Sermons.jsx';
import Events from './pages/Events.jsx';
import Gallery from './pages/Gallery.jsx';
import Prayer from './pages/Prayer.jsx';
import Give from './pages/Give.jsx';
import Contact from './pages/Contact.jsx';
import { NAV } from './data.js';

const SITE = "Potter's House Outreach Ministries International";

function Title() {
  const { pathname } = useLocation();
  useEffect(() => {
    const page = [...NAV, ['/give', 'Give']].find(([to]) => to === pathname);
    document.title = !page || page[0] === '/' ? `${SITE} | PHOMI` : `${page[1]} | ${SITE}`;
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
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="ministries" element={<Ministries />} />
          <Route path="sermons" element={<Sermons />} />
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
