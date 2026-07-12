import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { SEED_VENDORS, SEED_PRODUCTS, mapVendorRow, mapProductRow, withTimeout } from '$lib/seedCatalog';
import { fetchVendorsFromSupabase, fetchProductsFromSupabase } from '$lib/server/supabaseClient';

// SSR a per-product detail page so EVERY product is an individually crawlable, indexable URL
// (Google Shopping-style Product rich results). Mirrors the store SSR pattern: resolve the full
// catalog (remote → seed fallback), find the product by id, its vendor + related items.
export const load: PageServerLoad = async ({ params, fetch, setHeaders }) => {
  const id = Number(params.id);
  let vendors = [...SEED_VENDORS];
  let products = [...SEED_PRODUCTS];

  const [vRes, pRes] = await Promise.all([
    withTimeout(fetchVendorsFromSupabase(), 2500),
    withTimeout(fetchProductsFromSupabase(), 2500)
  ]);
  if (vRes?.data?.length) vendors = vRes.data.map(mapVendorRow);
  if (pRes?.data?.length) products = pRes.data.map(mapProductRow);

  const product = products.find((p) => Number(p.id) === id) || null;
  if (!product) throw error(404, 'পণ্যটি খুঁজে পাওয়া যায়নি');

  const vendor = vendors.find((v) => Number(v.id) === Number(product.vendorId)) || null;
  const related = products
    .filter(
      (p) =>
        Number(p.id) !== id &&
        String(p.category || '').toLowerCase() === String(product.category || '').toLowerCase()
    )
    .slice(0, 8);

  // Reviews (best-effort) → content + aggregateRating for the Product schema.
  let reviews: any[] = [];
  try {
    const r = await fetch(`/api/reviews?product_id=${id}`);
    const d = await r.json().catch(() => ({}));
    reviews = Array.isArray(d.reviews) ? d.reviews : [];
  } catch {
    /* reviews table may not exist yet — degrade to none */
  }
  const ratingCount = reviews.length;
  const ratingAvg = ratingCount
    ? Math.round((reviews.reduce((s, x) => s + (Number(x.rating) || 0), 0) / ratingCount) * 10) / 10
    : 0;

  setHeaders({ 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' });
  return { product, vendor, related, reviews, ratingAvg, ratingCount };
};
