import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { LiveProvider } from './live.jsx';
import { LangProvider } from './i18n.jsx';
// Fonts are served from this website (no Google Fonts): faster on slow networks, works offline, and visitors aren't tracked
import '@fontsource/cinzel/latin-600.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/playfair-display/latin-500.css';
import '@fontsource/playfair-display/latin-600.css';
import '@fontsource/playfair-display/latin-700.css';
import '@fontsource/playfair-display/latin-500-italic.css';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
// Luganda letters such as ŋ are in the latin-ext files; they only download when a page uses them
import '@fontsource/cinzel/latin-ext-600.css';
import '@fontsource/cinzel/latin-ext-700.css';
import '@fontsource/playfair-display/latin-ext-500.css';
import '@fontsource/playfair-display/latin-ext-600.css';
import '@fontsource/playfair-display/latin-ext-700.css';
import '@fontsource/playfair-display/latin-ext-500-italic.css';
import '@fontsource/poppins/latin-ext-400.css';
import '@fontsource/poppins/latin-ext-500.css';
import '@fontsource/poppins/latin-ext-600.css';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LiveProvider>
        <LangProvider>
          <App />
        </LangProvider>
      </LiveProvider>
    </BrowserRouter>
  </StrictMode>
);

// Saves the site's shell on the phone for instant, offline-ready pages (only on HTTPS or this computer)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && !location.pathname.startsWith('/admin')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
