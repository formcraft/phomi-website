// Copies the PHP backend into dist/api after the site is built, so dist/ is the whole website.
// Leaves out tests, local config and library clutter.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';

const src = 'api';
const out = join('dist', 'api');
const skipDirs = new Set(['tests', '.git', '.github', 'examples', 'fixtures', 'scripts', 'docs', 'doc', 'test', 'Tests']);
const skipFiles = new Set(['config.php', 'composer.json', 'composer.lock', '.php-cs-fixer.dist.php', 'phpunit.xml', 'phpunit.xml.dist', 'phpstan.neon']);

rmSync(out, { recursive: true, force: true });
cpSync(src, out, {
  recursive: true,
  filter: (p) => {
    const rel = relative(src, p);
    if (!rel) return true;
    const parts = rel.split(sep);
    const name = basename(p);
    // Only strip clutter inside libraries, and the top-level tests folder of our own code
    if (parts[0] === 'vendor') return !skipDirs.has(name) && !(name.endsWith('.md') && parts.length > 3);
    if (parts[0] === 'tests') return false;
    return !skipFiles.has(name);
  }
});
if (!existsSync(join(out, 'vendor'))) {
  console.warn('Note: api/vendor is missing. Run "composer install --no-dev" in api/ so Claude can read untagged emails.');
}
console.log('Copied the PHP backend to dist/api');
