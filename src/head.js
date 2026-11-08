import { SITE_NAME, SITE_URL, pageMeta } from './seo.js';

const tag = (sel, make) => document.head.querySelector(sel) || document.head.appendChild(make());
const meta = (attr, key, value) => {
  const m = tag(`meta[${attr}="${key}"]`, () => { const e = document.createElement('meta'); e.setAttribute(attr, key); return e; });
  m.setAttribute('content', value);
};

// Keeps the page title, description, canonical link and link-preview tags in step with the page shown
export function setHead({ path, title, description, noindex = false }) {
  const base = pageMeta(path);
  const t = title || base?.[1] || `${SITE_NAME} | PHOMI`;
  const d = description || base?.[2] || pageMeta('/')[2];
  document.title = t;
  meta('name', 'description', d);
  meta('property', 'og:title', t);
  meta('property', 'og:description', d);
  meta('property', 'og:url', SITE_URL + path);
  meta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
  const link = tag('link[rel="canonical"]', () => { const e = document.createElement('link'); e.rel = 'canonical'; return e; });
  link.href = SITE_URL + (path === '/' ? '/' : path);
}
