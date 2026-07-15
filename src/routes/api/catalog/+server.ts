import { json } from '@sveltejs/kit';
import { adminClient } from '$lib/server/vendorSync';
import type { RequestHandler } from './$types';

// Public read-only storefront catalog. The project's legacy anon key is disabled,
// so the browser can't read Supabase directly — it reads live products/vendors
// through this service_role-backed endpoint instead (only storefront-safe rows).
export const GET: RequestHandler = async () => {
  try {
    const a = adminClient();
    const cols = 'id,name,price,category,image_url,description,stock_quantity,vendor_id,is_active,created_at,moderation_score';
    // The curated storefront shows ONLY verified-vendor products — C2C "সরাসরি বাজার"
    // listings live at /api/bazar and must never leak in here (keeps the trust tiers
    // distinct). Fall back to the unfiltered query if listing_type isn't migrated, so
    // the storefront never dies over a missing column.
    const fetchProducts = async () => {
      let r = await a.from('products').select(cols).or('is_active.is.null,is_active.eq.true').or('listing_type.is.null,listing_type.eq.VENDOR');
      if (r.error) r = await a.from('products').select(cols).or('is_active.is.null,is_active.eq.true');
      return r.data || [];
    };
    const [pData, vRes, cRes] = await Promise.all([
      fetchProducts(),
      a.from('vendors').select('*'),
      a.from('categories').select('*')
    ]);
    const pRes = { data: pData };
    // THE real weight: a few rows stored the whole image as a base64 `data:` URL (one was
    // 200 KB by itself) → the catalog ballooned to ~1 MB. Never ship base64 to the client —
    // null it so productImg() shows the branded fallback. Also trim description to a snippet.
    const products = (pRes.data || []).map((p: any) => ({
      ...p,
      image_url: typeof p.image_url === 'string' && p.image_url.startsWith('data:') ? null : p.image_url,
      description: p.description ? String(p.description).slice(0, 140) : p.description
    }));
    return json(
      {
        ok: true,
        products,
        vendors: vRes.data || [],
        categories: cRes.data || []
      },
      {
        // Edge-cache the catalog longer so sparse launch traffic keeps it warm (fewer 3–4s
        // cold renders). Edits propagate within ~10 min; Aura/admin refresh still works.
        headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' }
      }
    );
  } catch {
    return json({ ok: false, products: [], vendors: [], categories: [] });
  }
};
