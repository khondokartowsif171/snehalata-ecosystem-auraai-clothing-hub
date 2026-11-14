import { json, error } from '@sveltejs/kit';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';
import type { RequestHandler } from './$types';

// Authoritative "who am I" for the vendor dashboard — resolves the vendor straight from the
// session token (not the CDN-cached catalog), so a brand-new / FB-connected store loads reliably
// and the dashboard knows whether a Facebook page is connected.
function adminClient(): SupabaseClient {
  const url = pub.PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw error(500, 'Neural Grid admin not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const GET: RequestHandler = async ({ request }) => {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) throw error(401, 'Missing vendor session');
  const a = adminClient();
  const { data: u, error: ae } = await a.auth.getUser(token);
  if (ae || !u?.user?.email) throw error(401, 'Session expired');

  // Step 1: Query rock-solid vendor identity columns (same as /api/vendor/products)
  const { data: vend } = await a
    .from('vendors')
    .select('id, store_name, email, status, vendor_type, commission_rate')
    .eq('email', u.user.email)
    .single();

  if (!vend) throw error(403, 'No store linked to this account');

  // Step 2: Query optional details safely
  let extra: any = {};
  try {
    const { data: d } = await a
      .from('vendors')
      .select('phone, website_url, category, fb_page_id, fb_page_name, fb_connected_at, district, area, description')
      .eq('id', vend.id)
      .maybeSingle();
    if (d) extra = d;
  } catch {}

  return json({ ok: true, vendor: { ...vend, ...extra } });
};
