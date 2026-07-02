import { json, error } from '@sveltejs/kit';
import { adminClient } from '$lib/server/vendorSync';
import { embedText, captionImage } from '$lib/server/gemini.server';
import { withTimeout, mapProductRow } from '$lib/seedCatalog';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 30 };
const vec = (v: number[]) => `[${v.join(',')}]`;

// A3 — semantic (text) + visual (photo) product search over pgvector embeddings.
// Public. Falls back to keyword search if embeddings / AI / migration aren't ready.
export const POST: RequestHandler = async ({ request }) => {
  const b = await request.json().catch(() => ({}));
  const q = typeof b?.q === 'string' ? b.q.trim() : '';
  const image = typeof b?.image === 'string' && b.image.startsWith('data:image') ? b.image : '';
  if (!q && !image) throw error(400, 'Provide a query or an image');

  const a = adminClient();

  const keyword = async (caption = '') => {
    const term = q || caption.split(/\s+/).slice(0, 3).join(' ');
    const { data } = await a.from('products').select('*').ilike('name', `%${term}%`).limit(24);
    return json({ ok: true, mode: 'keyword', caption, products: (data || []).map(mapProductRow) });
  };

  // Visual search: caption the photo, then embed the caption into the catalog's space.
  let caption = '';
  let queryText = q;
  if (image) {
    caption = (await withTimeout(captionImage(image), 20000)) || '';
    queryText = [caption, q].filter(Boolean).join('. ');
  }
  if (!queryText) return keyword(caption);

  const emb = await withTimeout(embedText(queryText), 15000);
  if (!emb) return keyword(caption);

  const { data: matches, error: me } = await a.rpc('match_products', {
    query_embedding: vec(emb),
    match_count: 18
  });
  if (me) return keyword(caption);

  const ids = (matches || []).map((m: any) => m.id);
  if (!ids.length) return json({ ok: true, mode: 'semantic', caption, products: [] });

  const { data: prods } = await a
    .from('products')
    .select('*')
    .in('id', ids)
    .or('is_active.is.null,is_active.eq.true');
  const byId = new Map((prods || []).map((p: any) => [p.id, p]));
  const ordered = ids.map((id: any) => byId.get(id)).filter(Boolean).map(mapProductRow);
  return json({ ok: true, mode: 'semantic', caption, products: ordered });
};
