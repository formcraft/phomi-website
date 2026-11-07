// Copies the PHP backend into dist/api after the site is built, so dist/ is the whole website.
// Leaves out tests and local config. The backend has no third-party libraries.
import { cpSync, rmSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';

const src = 'api';
const out = join('dist', 'api');
const skipFiles = new Set(['config.php']);

rmSync(out, { recursive: true, force: true });
cpSync(src, out, {
  recursive: true,
  filter: (p) => {
    const rel = relative(src, p);
    if (!rel) return true;
    if (rel.split(sep)[0] === 'tests') return false;
    return !skipFiles.has(basename(p));
  }
});
console.log('Copied the PHP backend to dist/api');
