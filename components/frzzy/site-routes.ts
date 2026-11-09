import { CASES } from './work-data';

/**
 * Addresses of the public site's pages. Each page has a clean URL (/work, /work/grid-runner, …;
 * route files in app/), and the site switches between them in place, with the page wipe, while
 * keeping the address bar in sync (components/frzzy/frzzy-site.tsx). In-site links use ids like
 * '#work' or '#case-grid-runner'; these helpers turn them into addresses.
 */

export type ViewRoute = 'home' | 'work' | 'case' | 'services' | 'about' | 'contact' | 'book';

export interface SiteRoute {
  view: ViewRoute;
  slug?: string;
}

const PAGES = ['work', 'services', 'about', 'contact', 'book'] as const;
const isPage = (key: string | undefined): key is (typeof PAGES)[number] => !!key && (PAGES as readonly string[]).includes(key);

/** '#home' → '/', '#work' → '/work', '#case-grid-runner' → '/work/grid-runner'. */
export function pathFor(id: string): string {
  const key = id.replace(/^#/, '');
  if (key.startsWith('case-')) return `/work/${key.slice('case-'.length)}`;
  return isPage(key) ? `/${key}` : '/';
}

/** Which page an address shows (unknown addresses show home). */
export function routeFromPath(pathname: string): SiteRoute {
  const [first, second] = pathname.split('/').filter(Boolean);
  if (first === 'work' && second) return CASES[second] ? { view: 'case', slug: second } : { view: 'work' };
  if (isPage(first)) return { view: first };
  return { view: 'home' };
}

/** An in-site link id or an old '#work'-style address: the page it means, or null. */
export function routeFromId(id: string): SiteRoute | null {
  const key = id.replace(/^#/, '');
  if (key.startsWith('case-')) {
    const slug = key.slice('case-'.length);
    return CASES[slug] ? { view: 'case', slug } : null;
  }
  if (key === 'home') return { view: 'home' };
  return isPage(key) ? { view: key } : null;
}
