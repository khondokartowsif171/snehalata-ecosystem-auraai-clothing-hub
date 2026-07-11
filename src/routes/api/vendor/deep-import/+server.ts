import { json, error } from '@sveltejs/kit';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';
import { renderAndExtract } from '$lib/server/deepImport.server';
import type { RequestHandler } from './$types';

// P5 — DEEP IMPORT (opt-in, heavy). Renders a vendor's site in a real headless Chromium so
// pure-SPA shops (products injected by JS, images lazy-loaded from private storage) can be
// imported when the fast static importer (/api/vendor/sync — Shopify feed + JSON-LD +
// og:image) can't see them. Products are inserted as pending (is_active:false) for admin
// review, exactly like the static importer. Big + slow → separate route, own maxDuration.
export const config = { maxDuration: 60, memory: 1536 };

function adminClient(): SupabaseClient {
  const url = pub.PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw error(500, 'Neural Grid admin not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function requireVendor(request: Request): Promise<string> {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) throw error(401, 'Missing vendor session');
  const admin = adminClient();
  const { data: u, error: e } = await admin.auth.getUser(token);
  if (e || !u?.user?.email) throw error(401, 'Session expired — please sign in again');
  return u.user.email;
}

export const POST: RequestHandler = async ({ request }) => {
  const email = await requireVendor(request);
  const admin = adminClient();

  // Resolve the caller's vendor + website.
  const { data: vendor } = await admin
    .from('vendors')
    .select('id,store_name,website_url')
    .eq('email', email)
    .maybeSingle();
  if (!vendor) throw error(404, 'Vendor not found');
  if (!vendor.website_url) throw error(400, 'Add your website URL first, then Deep Import.');

  let items: { name: string; price: number; imageUrl: string }[];
  try {
    items = await renderAndExtract(vendor.website_url);
  } catch (e: any) {
    // Headless not available (e.g. bundle/size limit) or the site blocked rendering.
    throw error(503, 'Deep render is unavailable right now — the standard Import still works for most sites.');
  }

  const { data: existing } = await admin.from('products').select('name').eq('vendor_id', vendor.id);
  const have = new Set((existing || []).map((p: any) => String(p.name || '').toLowerCase().trim()));

  const rows = items
    .filter((it) => it.name && !have.has(it.name.toLowerCase().trim()))
    .slice(0, 60)
    .map((it) => ({
      name: it.name.slice(0, 200),
      price: Number(it.price) || 0,
      category: 'Others',
      description: `Imported from ${vendor.store_name}`,
      image_url: it.imageUrl || '',
      stock_quantity: 10,
      vendor_id: vendor.id,
      is_active: false
    }));

  if (!rows.length) return json({ ok: true, imported: 0, found: items.length });
  const { error: insErr } = await admin.from('products').insert(rows);
  if (insErr) throw error(500, insErr.message);
  return json({ ok: true, imported: rows.length, found: items.length });
};
