import { json, error } from '@sveltejs/kit';
import { adminClient } from '$lib/server/vendorSync';
import type { RequestHandler } from './$types';

// Public read for স্নেহলতা সরাসরি বাজার (C2C). Kept SEPARATE from /api/catalog so
// peer-to-peer listings never leak into the curated, verified-vendor storefront —
// the two trust tiers stay visibly distinct.
export const GET: RequestHandler = async () => {
  try {
    const a = adminClient();
    const res = await a
      .from('products')
      .select('id,name,price,category,image_url,description,vendor_id,contact_phone,item_condition,moderation_score,created_at')
      .eq('listing_type', 'C2C')
      .or('is_active.is.null,is_active.eq.true')
      .order('id', { ascending: false })
      .limit(200);
    if (res.error) throw res.error;
    const listings = (res.data || []).map((p: any) => ({
      ...p,
      image_url: typeof p.image_url === 'string' && p.image_url.startsWith('data:') ? null : p.image_url,
      description: p.description ? String(p.description).slice(0, 160) : p.description
    }));
    return json({ ok: true, listings }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch {
    // listing_type column not migrated yet → feature simply shows empty, never 500s.
    return json({ ok: true, listings: [] });
  }
};

// Buyer-side safety: anyone can report a suspicious listing. A reported item is pulled
// from the বাজার immediately (is_active=false) and an admin can restore it — erring
// toward removing suspect items protects the anti-fake trust mission.
export const POST: RequestHandler = async ({ request }) => {
  const b = await request.json().catch(() => ({}));
  const id = Number(b?.report);
  if (!id) throw error(400, 'report id required');
  try {
    const a = adminClient();
    await a.from('products').update({ is_active: false, moderation_note: 'REPORTED — user flagged' }).eq('id', id).eq('listing_type', 'C2C');
    return json({ ok: true });
  } catch {
    return json({ ok: false });
  }
};
