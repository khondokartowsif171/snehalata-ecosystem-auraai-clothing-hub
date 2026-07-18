import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '$lib/server/vendorSync';
import { exchangeCode, getIdentityAndPages } from '$lib/server/fbConnect.server';
import crypto from 'crypto';
import type { RequestHandler } from './$types';

// After Meta consent: identify the seller, find-or-create their vendor (keyed by fb_user_id),
// store the connected page + its token, and log them in — no separate password ever set/shown.
export const GET: RequestHandler = async ({ url, cookies }) => {
  const back = (reason: string) => redirect(302, `/onboarding?fb=${reason}`);

  if (url.searchParams.get('error')) throw back('denied');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const saved = cookies.get('fb_state');
  cookies.delete('fb_state', { path: '/' });
  if (!code || !state || !saved || state !== saved) throw back('badstate');

  const userToken = await exchangeCode(code);
  if (!userToken) throw back('notoken');
  const ident = await getIdentityAndPages(userToken);
  if (!ident) throw back('noidentity');
  if (!ident.pages.length) throw back('nopage'); // seller granted login but selected no page
  const page = ident.pages[0]; // v1: first page (a picker is later polish)

  const a = adminClient();
  const authEmail = `fb-${ident.fbUserId}@snehalata.fb`;
  const fbFields = {
    fb_page_id: page.id,
    fb_page_name: page.name,
    fb_page_token: page.access_token,
    fb_connected_at: new Date().toISOString()
  };

  let { data: vendor } = await a.from('vendors').select('id,store_name,email').eq('fb_user_id', ident.fbUserId).maybeSingle();
  if (!vendor) {
    const { data: v, error: ve } = await a
      .from('vendors')
      .insert({
        store_name: page.name || ident.name || 'Facebook Store',
        owner_name: ident.name || '',
        email: authEmail,
        status: 'approved',
        vendor_type: 'FB',
        fb_user_id: ident.fbUserId,
        ...fbFields
      })
      .select('id,store_name,email')
      .single();
    if (ve) throw error(500, 'Could not create your store: ' + ve.message);
    vendor = v;
  } else {
    await a.from('vendors').update(fbFields).eq('id', vendor.id);
  }

  // ── Issue a Supabase session (the token /api/vendor/* verifies) without a user-facing password. ──
  const newPass = crypto.randomBytes(24).toString('hex') + 'Aa1!';
  const { data: created } = await a.auth.admin.createUser({ email: authEmail, password: newPass, email_confirm: true });
  let uid = created?.user?.id;
  if (!uid) {
    // auth user already exists → recover its id, then set a fresh password
    const { data: link } = await a.auth.admin.generateLink({ type: 'magiclink', email: authEmail });
    uid = link?.user?.id;
    if (uid) await a.auth.admin.updateUserById(uid, { password: newPass });
  }
  const anon = createClient(pub.PUBLIC_SUPABASE_URL || '', pub.PUBLIC_SUPABASE_ANON_KEY || '', {
    auth: { persistSession: false }
  });
  const { data: sess } = await anon.auth.signInWithPassword({ email: authEmail, password: newPass });
  const token = sess?.session?.access_token;
  if (!token) throw error(500, 'Connected, but could not start your session — try logging in.');

  // Hand the session to the dashboard via the URL hash (never sent to the server / logs).
  const frag = new URLSearchParams({
    fbt: token,
    fbid: String(vendor.id),
    fbe: vendor.email || authEmail
  });
  throw redirect(302, `/dashboard#${frag.toString()}`);
};
