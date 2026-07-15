import { json, error } from '@sveltejs/kit';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';
import { moderateListing } from '$lib/server/gemini.server';
import { withTimeout } from '$lib/seedCatalog';
import type { RequestHandler } from './$types';

// স্নেহলতা সরাসরি বাজার (Open Bazaar / C2C). An individual seller posts one item with
// their own contact number; buyers reach them directly (commission-free). Every listing
// is Aura-moderated at insert — flagged items are held (is_active=false) for admin review,
// which is how the anti-fake TRUST mission is preserved for an open, anyone-can-post tier.
export const config = { maxDuration: 30 };

function adminClient(): SupabaseClient {
  const url = pub.PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw error(500, 'Neural Grid admin not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// The seller's Supabase session token (from /api/vendor/login) identifies their INDIVIDUAL
// vendor node; the listing is always forced to their own vendor_id.
async function sellerFromToken(request: Request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) throw error(401, 'Missing session — please sign in again');
  const admin = adminClient();
  const { data: u, error: e } = await admin.auth.getUser(token);
  if (e || !u?.user?.email) throw error(401, 'Session expired — please sign in again');
  const { data: vend } = await admin.from('vendors').select('id, store_name, phone').eq('email', u.user.email).single();
  if (!vend) throw error(403, 'No seller profile linked to this account');
  return { admin, vend };
}

export const POST: RequestHandler = async ({ request, platform }) => {
  const { admin, vend } = await sellerFromToken(request);
  const b = await request.json().catch(() => ({}));

  const name = String(b?.name || '').trim();
  const price = Number(b?.price);
  const contactPhone = String(b?.contact_phone || b?.contactPhone || vend.phone || '').replace(/[^0-9+]/g, '');
  if (!name || !price || price <= 0) throw error(400, 'পণ্যের নাম ও সঠিক দাম দিন');
  if (!contactPhone || contactPhone.replace(/[^0-9]/g, '').length < 11) throw error(400, 'যোগাযোগের সঠিক মোবাইল নম্বর দিন');

  const row: Record<string, any> = {
    name,
    price,
    category: b.category || 'others',
    description: String(b.description || ''),
    image_url: b.image_url || b.imageUrl || '',
    stock_quantity: 1,
    vendor_id: vend.id,
    listing_type: 'C2C',
    contact_phone: contactPhone,
    item_condition: String(b.item_condition || b.condition || '').slice(0, 60)
  };

  const { data, error: e } = await admin.from('products').insert(row).select().single();
  if (e) throw error(500, e.message);

  // Aura moderation runs in the background (Gemini is slow) so posting feels instant.
  // A flagged listing is pulled from the বাজার (is_active=false) until an admin clears it.
  const moderate = async () => {
    try {
      const m = await withTimeout(moderateListing(row.name, row.description, row.price, row.category), 12000);
      if (m) {
        const patch: any = { moderation_score: Math.round(Number(m.trust_score) || 0), moderation_note: m.note || null };
        if (m.verdict === 'REVIEW') patch.is_active = false;
        await admin.from('products').update(patch).eq('id', data.id);
      }
    } catch { /* Gemini offline / columns absent — leave live, admin can review */ }
  };
  const waitUntil = (platform as any)?.context?.waitUntil;
  if (typeof waitUntil === 'function') waitUntil(moderate());
  else moderate().catch(() => {});

  return json({ ok: true, listing: data });
};
