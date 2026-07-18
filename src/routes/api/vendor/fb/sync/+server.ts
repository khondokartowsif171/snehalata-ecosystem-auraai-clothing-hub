import { json, error } from '@sveltejs/kit';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';
import { fetchPageProducts } from '$lib/server/fbConnect.server';
import { snapImportedCategory } from '$lib/server/vendorSync';
import type { RequestHandler } from './$types';

// Headless render is not used here, but the vision extractor + Graph calls can take a while.
export const config = { maxDuration: 60, memory: 1024 };

function adminClient(): SupabaseClient {
  const url = pub.PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw error(500, 'Neural Grid admin not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// "Sync from Facebook" — pulls the vendor's connected page and files its products for Review.
export const POST: RequestHandler = async ({ request }) => {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) throw error(401, 'Missing vendor session');
  const a = adminClient();
  const { data: u, error: ae } = await a.auth.getUser(token);
  if (ae || !u?.user?.email) throw error(401, 'Session expired — connect again');

  const { data: vend } = await a
    .from('vendors')
    .select('id, store_name, fb_page_id, fb_page_token')
    .eq('email', u.user.email)
    .single();
  if (!vend) throw error(403, 'No store linked to this account');
  if (!vend.fb_page_id || !vend.fb_page_token) throw error(400, 'No Facebook page connected — connect one first.');

  const items = await fetchPageProducts(vend.fb_page_id, vend.fb_page_token);
  const found = items.length;

  // Dedupe against what the store already has, snap categories, everything pending for Review.
  const { data: existing } = await a.from('products').select('name').eq('vendor_id', vend.id);
  const have = new Set((existing || []).map((p: any) => String(p.name || '').toLowerCase().trim()));
  const seen = new Set<string>();
  const rows = items
    .filter((it) => {
      const k = String(it.name || '').toLowerCase().trim();
      if (!k || k.length < 2 || have.has(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 80)
    .map((it) => ({
      name: it.name.slice(0, 200),
      price: Number(it.price) || 0,
      category: snapImportedCategory(it.category),
      description: it.description ? it.description.slice(0, 300) : `Imported from Facebook — ${vend.store_name}`,
      image_url: it.imageUrl || '',
      stock_quantity: 10,
      vendor_id: vend.id,
      is_active: false
    }));
  if (rows.length) {
    const { error: ie } = await a.from('products').insert(rows);
    if (ie) throw error(500, ie.message);
  }

  return json({
    ok: true,
    found,
    imported: rows.length,
    note: rows.length
      ? null
      : found
        ? 'Found posts but they matched products already in your store.'
        : 'No clear products found in your recent Facebook posts — post a product photo with its price, then sync again.'
  });
};
