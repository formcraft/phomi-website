// After "vite build": one HTML file per page with its own title, description and link-preview tags,
// the church details for Google (schema.org), sitemap.xml and robots.txt.
// The live address comes from SITE_URL (default: the church domain in src/seo.js).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES, SITE_NAME, SITE_URL as DEFAULT_URL, churchSchema } from '../src/seo.js';

const SITE_URL = (process.env.SITE_URL || DEFAULT_URL).replace(/\/$/, '');
const dist = 'dist';
const base = readFileSync(join(dist, 'index.html'), 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Each page's own code chunk (from Vite's manifest), so the browser fetches it together with the main script
let manifest = {};
try { manifest = JSON.parse(readFileSync(join(dist, '.vite', 'manifest.json'), 'utf8')); } catch { /* no manifest: skip preloads */ }
const chunkOf = (path) => {
  const name = { '/about': 'About', '/ministries': 'Ministries', '/sermons': 'Sermons', '/bible': 'Bible', '/events': 'Events', '/gallery': 'Gallery', '/testimonies': 'Testimonies', '/prayer': 'Prayer', '/give': 'Give', '/contact': 'Contact' }[path];
  const m = name && manifest[`src/pages/${name}.jsx`];
  if (!m) return [];
  const files = [m.file, ...(m.imports || []).filter((i) => manifest[i] && !manifest[i].isEntry).map((i) => manifest[i].file)];
  return [...files.map((f) => `<link rel="modulepreload" href="/${f}" />`), ...(m.css || []).map((c) => `<link rel="stylesheet" href="/${c}" />`)];
};
const schema = JSON.stringify({ ...churchSchema(), url: SITE_URL, '@id': `${SITE_URL}/#church` }).replace(/</g, '\\u003c');

for (const [path, title, description] of PAGES) {
  const url = SITE_URL + path;
  let html = base
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(description)}" />`)
    .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${SITE_URL}/img/og-image.jpg" />`);
  html = html.replace('</head>', [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    '<meta property="og:locale" content="en_GB" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="robots" content="index, follow" />',
    `<script type="application/ld+json">${schema}</script>`,
    ...chunkOf(path),
  ].map((l) => '    ' + l).join('\n') + '\n  </head>');
  // For visitors and crawlers without JavaScript
  const links = PAGES.map(([p, t]) => `<a href="${p}">${esc(t.split(' | ')[0])}</a>`).join(' · ');
  html = html.replace('<div id="root"></div>', `<div id="root"></div>\n    <noscript><h1>${esc(title.split(' | ')[0])}</h1><p>${esc(description)}</p><p>${links}</p></noscript>`);
  writeFileSync(join(dist, path === '/' ? 'index.html' : `${path.slice(1)}.html`), html);
}

const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(([p, , , pri]) => `  <url><loc>${SITE_URL}${p}</loc><lastmod>${today}</lastmod><priority>${pri.toFixed(1)}</priority></url>`).join('\n')}
</urlset>
`);
writeFileSync(join(dist, 'robots.txt'), `User-agent: *
Disallow: /admin
Disallow: /api/
Allow: /api/verse/image

Sitemap: ${SITE_URL}/sitemap.xml
`);
// The service worker: keeps the site's shell (HTML, scripts, styles) on the phone so pages open instantly,
// and still open with no signal. The list of files changes with every build, so phones pick up new versions.
{
  const { createHash } = await import('node:crypto');
  const files = [...new Set(Object.values(manifest).filter((m) => !/Admin/.test(m.file)).flatMap((m) => [m.file, ...(m.css || [])]))].map((f) => '/' + f);
  const shell = ['/', ...PAGES.filter(([p]) => p !== '/').map(([p]) => p)];
  const version = createHash('sha1').update(JSON.stringify(files) + readFileSync(join(dist, 'index.html'), 'utf8')).digest('hex').slice(0, 10);
  const sw = readFileSync('src/sw-template.js', 'utf8')
    .replace('__VERSION__', version)
    .replace('__ASSETS__', JSON.stringify(files))
    .replace('__SHELL__', JSON.stringify(shell));
  writeFileSync(join(dist, 'sw.js'), sw);
}
console.log(`Search pages, sitemap and robots.txt written for ${SITE_URL} (${PAGES.length} pages)`);
