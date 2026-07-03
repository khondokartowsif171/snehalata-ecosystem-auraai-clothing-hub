import { json } from '@sveltejs/kit';
import { adminClient } from '$lib/server/vendorSync';
import type { RequestHandler } from './$types';

// Public read-only storefront catalog. The project's legacy anon key is disabled,
// so the browser can't read Supabase directly — it reads live products/vendors
// through this service_role-backed endpoint instead (only storefront-safe rows).
export const GET: RequestHandler = async () => {
  try {
    const a = adminClient();
    const [pRes, vRes, cRes] = await Promise.all([
      a.from('products').select('*').or('is_active.is.null,is_active.eq.true'),
      a.from('vendors').select('*'),
      a.from('categories').select('*')
    ]);
    return json({
      ok: true,
      products: pRes.data || [],
      vendors: vRes.data || [],
      categories: cRes.data || []
    });
  } catch {
    return json({ ok: false, products: [], vendors: [], categories: [] });
  }
};
