import { json, error } from '@sveltejs/kit';
import { adminClient } from '$lib/server/vendorSync';
import { embedText, captionImage } from '$lib/server/gemini.server';
import { classifyGarmentCategory } from '$lib/server/freeImageEngine.server';
import { withTimeout, mapProductRow, SEED_PRODUCTS } from '$lib/seedCatalog';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 30 };
const vec = (v: number[]) => `[${v.join(',')}]`;

// Bilingual color & garment synonym groups for hybrid scoring (Voice 🎙️ + Photo 📷 + Text)
const COLOR_SYNONYMS: { name: string; terms: string[] }[] = [
  { name: 'green', terms: ['green', 'emerald', 'olive', 'bottle green', 'mint', 'sage', 'সবুজ', 'জলপাই', 'পেস্তা'] },
  { name: 'red', terms: ['red', 'crimson', 'maroon', 'burgundy', 'wine', 'লাল', 'মেরুন', 'খয়েরি'] },
  { name: 'blue', terms: ['blue', 'navy', 'indigo', 'sky', 'teal', 'royal', 'নীল', 'আকাশি', 'নেভি'] },
  { name: 'black', terms: ['black', 'charcoal', 'dark', 'কালো', 'অ্যাশ'] },
  { name: 'white', terms: ['white', 'cream', 'ivory', 'beige', 'সাদা', 'ক্রিম', 'ঘিয়া'] },
  { name: 'pink', terms: ['pink', 'rose', 'blush', 'peach', 'coral', 'গোলাপী', 'গোলাপি', 'পিচ'] },
  { name: 'purple', terms: ['purple', 'lavender', 'violet', 'plum', 'mauve', 'বেগুনি', 'ল্যাভেন্ডার', 'ওয়াইন'] },
  { name: 'gold', terms: ['gold', 'golden', 'yellow', 'mustard', 'bronze', 'সোনালী', 'সোনালি', 'হলুদ', 'বাসন্তী'] },
  { name: 'brown', terms: ['brown', 'chocolate', 'khaki', 'tan', 'coffee', 'বাদামী', 'খাকি', 'চকলেট'] }
];

const CATEGORY_MAP_DB: Record<string, string[]> = {
  saree: ['saree', 'শাড়ি', 'শাড়ি', 'jamdani', 'জামদানি', 'katan', 'কাতান', 'tant', 'তাঁত', 'muslin', 'মসলিন'],
  'three-piece': ['three-piece', 'threepiece', 'থ্রি-পিস', 'থ্রি পিস', 'থ্রিপিস', 'salwar', 'kameez', 'সালোয়ার', 'কামিজ', 'kurti', 'কুর্তি'],
  borka: ['borka', 'বোরকা', 'abaya', 'আবায়া', 'hijab', 'হিজাব'],
  panjabi: ['panjabi', 'পাঞ্জাবি', 'পাঞ্জাবী', 'kurta', 'কুর্তা', 'kabli', 'কাবলি'],
  't-shirt': ['t-shirt', 'tshirt', 'টি-শার্ট', 'টিশার্ট', 'গেঞ্জি', 'পোলো', 'polo', 'henley', 'tee'],
  shirt: ['shirt', 'শার্ট', 'formal shirt', 'casual shirt', 'ফরমাল শার্ট', 'ক্যাজুয়াল শার্ট'],
  pant: ['pant', 'প্যান্ট', 'jeans', 'জিন্স', 'denim', 'ডেনিম', 'trouser', 'ট্রাউজার', 'gabardine', 'গ্যাবার্ডিন', 'cargo', 'কার্গো', 'chino'],
  baby: ['baby', 'kids', 'child', 'বেবি', 'বাচ্চা', 'বাচ্চাদের', 'শিশু', 'ছোটদের', 'ফ্রক', 'frock'],
  blazer: ['blazer', 'suit', 'coat', 'waistcoat', 'koti', 'ব্লেজার', 'স্যুট', 'কোট', 'কটি', 'জ্যাকেট', 'jacket'],
  cosmetics: ['cosmetics', 'কসমেটিকস', 'মেকআপ', 'makeup', 'cream', 'ক্রিম', 'serum', 'সিরাম', 'lotion', 'লোশন', 'cleanser', 'sun', 'lip'],
  undergarments: ['undergarments', 'undergarment', 'আন্ডারগার্মেন্টস', 'নাইটি', 'ইনারওয়্যার', 'bra', 'nightwear']
};

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'photo', 'image', 'shows', 'wearing',
  'person', 'man', 'woman', 'model', 'standing', 'featuring', 'combined', 'pattern', 'fabric',
  'solid', 'smooth', 'high-contrast', 'printed', 'textured', 'আমি', 'চাই', 'খুঁজছি', 'দেখান', 'একটা', 'কিছু'
]);

// A3 — semantic (text/voice 🎙️) + visual (photo 📷) product search over catalog + pgvector embeddings.
export const POST: RequestHandler = async ({ request }) => {
  const b = await request.json().catch(() => ({}));
  const q = typeof b?.q === 'string' ? b.q.trim() : '';
  const image = typeof b?.image === 'string' && b.image.startsWith('data:image') ? b.image : '';
  if (!q && !image) throw error(400, 'Provide a query or an image');

  const a = adminClient();

  // 1. Visual search: caption the uploaded photo (Florence-2 + Sharp Color Vision or Gemini)
  let caption = '';
  if (image) {
    caption = (await withTimeout(captionImage(image), 18000)) || '';
  }

  const combinedQuery = [q, caption].filter(Boolean).join(' ').trim();
  const qLower = combinedQuery.toLowerCase();

  // Detect target garment category & color signals from query/photo
  const tax = classifyGarmentCategory('', q, caption, caption, '');
  const targetKind = tax.kind;
  const detectedColors = COLOR_SYNONYMS.filter((c) => c.terms.some((t) => qLower.includes(t)));

  // Extract meaningful search tokens
  const rawTokens = qLower
    .replace(/[()[\],.;:—–/\\+-]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w) && !/^\d+%?$/.test(w));

  // Fetch all active products from Supabase (fast in-memory hybrid ranker over ~100-500 catalog items)
  const [{ data: allProds }, emb] = await Promise.all([
    a.from('products').select('*').or('is_active.is.null,is_active.eq.true').limit(300),
    withTimeout(embedText(combinedQuery), 6000).catch(() => null)
  ]);

  // Also check pgvector semantic matches if available
  const pgRankMap = new Map<number, number>();
  if (emb) {
    try {
      const { data: matches } = await a.rpc('match_products', {
        query_embedding: vec(emb),
        match_count: 18
      });
      if (Array.isArray(matches)) {
        matches.forEach((m: any, idx: number) => {
          pgRankMap.set(Number(m.id), Math.max(5, 30 - idx * 1.5));
        });
      }
    } catch {
      // ignore rpc error
    }
  }

  const pool = (allProds && allProds.length ? allProds.map(mapProductRow) : SEED_PRODUCTS);

  const scored = pool.map((p: any) => {
    let score = 0;
    const pName = String(p.name || '').toLowerCase();
    const pCat = String(p.category || '').toLowerCase();
    const pDesc = String(p.description || '').toLowerCase();
    const pImg = String(p.imageUrl || '').toLowerCase();
    const pFull = `${pName} ${pCat} ${pDesc} ${pImg}`;

    // A. Category match boost (+60 points)
    if (targetKind !== 'other') {
      const pTax = classifyGarmentCategory(p.category, p.name, p.description, '', p.imageUrl);
      if (pTax.kind === targetKind) {
        score += 60;
      } else if (targetKind === 'blazer' && (pTax.kind === 'baby' || pTax.kind === 'shirt') && /suit|blazer|koti|waistcoat|স্যুট|ব্লেজার|কটি/i.test(pFull)) {
        score += 55;
      } else if (
        (targetKind === 'shirt' && pTax.kind === 't-shirt') ||
        (targetKind === 't-shirt' && pTax.kind === 'shirt')
      ) {
        score -= 25; // Prevent T-Shirt and Shirt collision
      } else {
        score -= 15;
      }
    } else {
      // Check if any category synonym appears in query
      for (const [catKey, terms] of Object.entries(CATEGORY_MAP_DB)) {
        if (terms.some((t) => qLower.includes(t))) {
          if (pCat === catKey || terms.some((t) => pFull.includes(t))) {
            score += 45;
          }
        }
      }
    }

    // B. Color match boost (+32 points per matched color family)
    for (const col of detectedColors) {
      if (col.terms.some((t) => pFull.includes(t))) {
        score += 32;
      }
    }

    // C. Direct query substring / token match
    if (q && pName.includes(q.toLowerCase())) {
      score += 55;
    } else if (q && pDesc.includes(q.toLowerCase())) {
      score += 30;
    }

    for (const tok of rawTokens.slice(0, 10)) {
      if (pName.includes(tok)) score += 18;
      else if (pDesc.includes(tok) || pCat.includes(tok)) score += 10;
    }

    // D. pgvector semantic similarity bonus (only boost if category doesn't clash)
    const pgBonus = pgRankMap.get(Number(p.id)) || 0;
    if (pgBonus > 0 && score >= 0) {
      score += pgBonus;
    }

    return { product: p, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Filter to positive matches; if a visual photo had a generic caption, return top category/color matches
  let matched = scored.filter((item) => item.score >= 18).map((item) => item.product);
  if (matched.length === 0) {
    matched = scored.filter((item) => item.score > 0).map((item) => item.product);
  }
  if (matched.length === 0 && image) {
    matched = scored.slice(0, 12).map((item) => item.product);
  }

  // Build a clean user-facing summary caption for visual search
  const displayCaption = caption
    ? caption.replace(/\s+/g, ' ').slice(0, 140)
    : '';

  return json({
    ok: true,
    mode: image ? 'visual' : 'semantic',
    caption: displayCaption,
    detectedCategory: targetKind !== 'other' ? targetKind : null,
    products: matched.slice(0, 24)
  });
};
