// Importer v2 sources — Daraz JSON, an honest Facebook/Instagram handler, and the universal
// Gemini-vision booster that lets ANY page with visible products import even without a feed.
// Kept separate from vendorSync so the heavy Gemini-vision path is only pulled in where used.
import axios from 'axios';
import * as gemini from '$lib/server/gemini.server';

export type SocialItem = {
  name: string;
  price: number;
  imageUrl: string;
  category?: string;
  description?: string;
};
export type SocialResult = { items: SocialItem[]; note?: string; source: string };

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Daraz shop/seller/product pages embed the catalog as JSON inside a <script> (app.run({…}) /
// window.pageData). Pull name + price + image straight from it — structured and reliable. If the
// page shape changes or is JS-gated, we return [] and the caller falls through to headless+vision.
export async function importFromDaraz(url: string): Promise<SocialResult> {
  try {
    const resp = await axios.get(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en' },
      timeout: 15000,
      maxContentLength: 12_000_000,
      responseType: 'text',
      transformResponse: (d) => d
    });
    const text = String(resp.data || '');
    const items: SocialItem[] = [];
    const seen = new Set<string>();
    // Match product-ish JSON objects that carry a name, a price, and an image url together.
    const re =
      /"name"\s*:\s*"([^"]{3,160})"[^{}]*?"(?:priceShow|price|salePrice|sellingPrice)"\s*:\s*"?([^",}]+)"?[^{}]*?"(?:image|images?|thumbnail|mainImage)"\s*:\s*"([^"]+?\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) && items.length < 80) {
      const name = m[1].replace(/\\u[\dA-Fa-f]{4}/g, ' ').replace(/\s+/g, ' ').trim();
      const price = parseInt(String(m[2]).replace(/[^\d]/g, '')) || 0;
      let img = m[3].replace(/\\\//g, '/');
      if (img.startsWith('//')) img = 'https:' + img;
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      items.push({ name, price, imageUrl: img });
    }
    if (items.length) return { items, source: 'daraz-json' };
    return { items: [], source: 'daraz' };
  } catch {
    return { items: [], note: 'Daraz blocked the request or the page is unavailable.', source: 'daraz' };
  }
}

// Facebook / Instagram: URL-scraping is blocked by Meta now (mbasic is dead → HTTP 400, www needs
// login). We stay honest — no fake import. The real path is the seller CONNECTING their page via
// OAuth/Graph (a separate build). Point the admin at a website/Daraz link instead.
export function importFromSocial(url: string): SocialResult {
  const isIg = /instagram\.com/i.test(url);
  const name = isIg ? 'Instagram' : 'Facebook';
  return {
    items: [],
    source: isIg ? 'instagram' : 'facebook',
    note: `${name} pages can't be imported from a URL — Meta blocks public page scraping. To import a ${name} shop, the seller needs to connect their page (page-connect is coming soon), or paste their website / Daraz store link here instead.`
  };
}

// Universal "any website" booster: hand image+caption pairs to Gemini vision → real products.
export async function extractProductsFromMedia(
  media: { imageUrl: string; caption?: string }[]
): Promise<SocialItem[]> {
  const clean = media.filter((m) => m.imageUrl && /^https?:\/\//i.test(m.imageUrl));
  if (!clean.length) return [];
  try {
    const r = await gemini.analyzeProductMedia(clean);
    return r.map((p) => ({
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl,
      category: p.category,
      description: p.description
    }));
  } catch {
    return [];
  }
}
