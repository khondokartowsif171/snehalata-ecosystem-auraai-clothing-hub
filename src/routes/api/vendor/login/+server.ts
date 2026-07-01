import { json, error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';
import type { RequestHandler } from './$types';

// Vendor login via Supabase Auth (email + password). Returns the vendor's record
// and a session token used to authorize product writes in /api/vendor/products.
export const POST: RequestHandler = async ({ request }) => {
  const { email, password } = await request.json();
  if (!email || !password) throw error(400, 'Email and password are required');

  const url = pub.PUBLIC_SUPABASE_URL;
  if (!url || !pub.PUBLIC_SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw error(500, 'Neural Grid auth not configured');
  }

  const anon = createClient(url, pub.PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error: e } = await anon.auth.signInWithPassword({ email, password });
  if (e || !data?.session) throw error(401, 'Invalid vendor credentials');

  const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: vend } = await admin
    .from('vendors')
    .select('id, store_name, status, email')
    .eq('email', email)
    .single();
  if (!vend) throw error(403, 'No vendor node is linked to this email');

  return json({ ok: true, vendor: vend, token: data.session.access_token });
};
