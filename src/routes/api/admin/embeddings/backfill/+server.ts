import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminClient } from '$lib/server/vendorSync';
import { embedText } from '$lib/server/gemini.server';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 60 };

function assertAdmin(request: Request) {
  const pass = request.headers.get('x-admin-pass') ?? '';
  if (!env.ADMIN_PASSWORD || pass !== env.ADMIN_PASSWORD) throw error(401, 'Unauthorized');
}

const vec = (v: number[]) => `[${v.join(',')}]`;

// A3 — embed products that don't have a vector yet (run repeatedly until remaining=0).
// Batches of 50 per call to stay within the function budget.
export const POST: RequestHandler = async ({ request }) => {
  assertAdmin(request);
  const a = adminClient();
  const { data: prods, error: e } = await a
    .from('products')
    .select('id,name,description,category')
    .is('embedding', null)
    .limit(50);
  if (e) throw error(500, e.message);

  let embedded = 0;
  let failed = 0;
  for (const p of prods || []) {
    const text = [p.name, p.category, p.description].filter(Boolean).join('. ').slice(0, 2000);
    const emb = await embedText(text);
    if (!emb) { failed++; continue; }
    const { error: ue } = await a.from('products').update({ embedding: vec(emb) }).eq('id', p.id);
    if (ue) failed++;
    else embedded++;
  }

  return json({ ok: true, embedded, failed, batch: prods?.length || 0 });
};
