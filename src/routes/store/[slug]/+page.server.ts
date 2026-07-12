import type { PageServerLoad } from './$types';
import { SEED_VENDORS, SEED_PRODUCTS, mapVendorRow, mapProductRow, withTimeout } from '$lib/seedCatalog';
import { fetchVendorsFromSupabase, fetchProductsFromSupabase } from '$lib/server/supabaseClient';

// SSR the storefront so `<slug>.snehalata.com` (which reroutes to /store/<slug>) renders the
// vendor's shop on the FIRST paint. Previously the page did a CLIENT-only lookup from the async
// catalog store, which raced the load and showed "স্টোর খুঁজে পাওয়া যায়নি" until a refresh.
// vendors.slug is derived from store_name (the DB has no slug column) — same as mapVendorRow.
export const load: PageServerLoad = async ({ params, setHeaders }) => {
  const slug = params.slug;
  let vendors = [...SEED_VENDORS];
  let products = [...SEED_PRODUCTS];

  const [vRes, pRes] = await Promise.all([
    withTimeout(fetchVendorsFromSupabase(), 2500),
    withTimeout(fetchProductsFromSupabase(), 2500)
  ]);
  if (vRes?.data?.length) vendors = vRes.data.map(mapVendorRow);
  if (pRes?.data?.length) products = pRes.data.map(mapProductRow);

  const vendor = vendors.find((v) => v.slug === slug) || null;
  const vendorProducts = vendor ? products.filter((p) => p.vendorId === Number(vendor.id)) : [];

  // Edge-cache like the home; the client hydrates with the same data.
  setHeaders({ 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' });
  return { vendor, products: vendorProducts };
};
