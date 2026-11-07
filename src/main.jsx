import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { LiveProvider } from './live.jsx';
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
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LiveProvider>
        <App />
      </LiveProvider>
    </BrowserRouter>
  </StrictMode>
);
