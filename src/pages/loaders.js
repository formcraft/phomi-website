// The code for each page, loaded only when needed. Paths match the routes in App.jsx.
export const PAGE_LOADERS = {
  about: () => import('./About.jsx'),
  ministries: () => import('./Ministries.jsx'),
  sermons: () => import('./Sermons.jsx'),
  bible: () => import('./Bible.jsx'),
  events: () => import('./Events.jsx'),
  gallery: () => import('./Gallery.jsx'),
  testimonies: () => import('./Testimonies.jsx'),
  prayer: () => import('./Prayer.jsx'),
  give: () => import('./Give.jsx'),
  contact: () => import('./Contact.jsx'),
};

// After the first page has shown, fetch the other pages' code while the phone is idle,
// so every next tap opens instantly. Skipped when the visitor asked to save data.
let warmed = false;
export function warmPages() {
  if (warmed || typeof window === 'undefined') return;
  warmed = true;
  if (navigator.connection?.saveData) return;
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500));
  const list = Object.values(PAGE_LOADERS);
  const next = () => {
    const load = list.shift();
    if (load) load().catch(() => {}).finally(() => idle(next));
  };
  setTimeout(() => idle(next), 1200);
}

// Start loading a page's code as soon as a finger or mouse is on its link
export function warmPath(pathname) {
  const load = PAGE_LOADERS[String(pathname || '').replace(/^\//, '').split(/[/?#]/)[0]];
  if (load) load().catch(() => {});
}
