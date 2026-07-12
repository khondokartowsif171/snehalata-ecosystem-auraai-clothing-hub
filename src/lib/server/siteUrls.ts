import {
  SEED_VENDORS,
  SEED_PRODUCTS,
  mapVendorRow,
  mapProductRow,
  dedupeById,
  withTimeout
} from '$lib/seedCatalog';
import { fetchVendorsFromSupabase, fetchProductsFromSupabase } from '$lib/server/supabaseClient';

export const SITE_URL = 'https://www.snehalata.com';

const STATIC_ROUTES: Array<{ path: string; priority: string; changefreq: string }> = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/guide', priority: '0.6', changefreq: 'monthly' },
  { path: '/studio', priority: '0.7', changefreq: 'weekly' },
  { path: '/onboarding', priority: '0.7', changefreq: 'monthly' },
  { path: '/cart', priority: '0.3', changefreq: 'monthly' },
  { path: '/tracking', priority: '0.4', changefreq: 'monthly' },
  { path: '/legal', priority: '0.3', changefreq: 'yearly' }
];

export type SiteUrl = { loc: string; priority: string; changefreq: string };

// The canonical list of PUBLIC, indexable URLs (static routes + store pages + try-on pages).
// Shared by /sitemap.xml AND the IndexNow push so there is ONE source of truth.
export async function buildSiteUrls(): Promise<SiteUrl[]> {
  let vendors = [...SEED_VENDORS];
  let products = [...SEED_PRODUCTS];

  const remote = await withTimeout(
    Promise.all([fetchVendorsFromSupabase(), fetchProductsFromSupabase()]),
    2500
  );
  if (remote) {
    const [vRes, pRes] = remote;
    if (vRes?.data?.length) vendors = dedupeById([...SEED_VENDORS, ...vRes.data.map(mapVendorRow)]);
    if (pRes?.data?.length) products = dedupeById([...SEED_PRODUCTS, ...pRes.data.map(mapProductRow)]);
  }

  const urls: SiteUrl[] = STATIC_ROUTES.map((r) => ({
    loc: `${SITE_URL}${r.path}`,
    priority: r.priority,
    changefreq: r.changefreq
  }));
  for (const v of vendors) {
    if (v.status === 'BLOCKED' || !v.slug) continue;
    urls.push({ loc: `${SITE_URL}/store/${encodeURIComponent(v.slug)}`, priority: '0.8', changefreq: 'weekly' });
  }
  for (const p of products) {
    // Per-product indexable detail page (Product rich results) — highest product priority.
    urls.push({ loc: `${SITE_URL}/product/${p.id}`, priority: '0.7', changefreq: 'weekly' });
    urls.push({ loc: `${SITE_URL}/try-on/${p.id}`, priority: '0.5', changefreq: 'weekly' });
  }
  return urls;
}
