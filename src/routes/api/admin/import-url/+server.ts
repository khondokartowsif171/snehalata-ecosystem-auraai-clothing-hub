import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminClient, syncVendor, snapImportedCategory } from '$lib/server/vendorSync';
import { renderAndExtract } from '$lib/server/deepImport.server';
import {
  importFromDaraz,
  importFromSocial,
  extractProductsFromMedia,
  type SocialItem
} from '$lib/server/socialImport.server';
import type { RequestHandler } from './$types';

// Admin "Import from ANY website" — paste any shop link and Aura files its products under a store
// auto-created from that site (all pending / is_active:false for Review). v2 (2026-07-18): a source
// router (Daraz JSON, honest Facebook/Instagram) + a universal headless+Gemini-vision fallback so a
// feedless SPA / custom site imports too, not only Shopify/WooCommerce feeds.
export const config = { maxDuration: 60, memory: 1536 };

function assertAdmin(request: Request) {
  const pass = request.headers.get('x-admin-pass') ?? '';
  if (!env.ADMIN_PASSWORD || pass !== env.ADMIN_PASSWORD) throw error(401, 'Unauthorized — admin only');
}

function normalizeUrl(u: string): string {
  const s = String(u || '').trim();
  return /^https?:\/\//i.test(s) ? s : 'https://' + s;
}

function hostOf(u: string): string {
  try {
    return new URL(normalizeUrl(u)).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function storeNameFromUrl(u: string): string {
  const host = hostOf(u);
  const base = (host.split('.')[0] || host).replace(/[-_]+/g, ' ').trim();
  if (!base) return 'Imported Store';
  return base.replace(/\b\w/g, (m) => m.toUpperCase());
}

type Vendor = { id: number; store_name: string; website_url?: string | null };

// Shared insert — dedupe against what the store already has, snap the category to a real one, cap 80,
// everything pending for Review. Used by the deep/social/auto-fallback branches.
async function insertItems(a: ReturnType<typeof adminClient>, vendor: Vendor, items: SocialItem[]): Promise<number> {
  if (!items.length) return 0;
  const { data: existing } = await a.from('products').select('name').eq('vendor_id', vendor.id);
  const have = new Set((existing || []).map((p: any) => String(p.name || '').toLowerCase().trim()));
  const seen = new Set<string>();
  const rows = items
    .filter((it) => {
      const k = String(it.name || '').toLowerCase().trim();
      if (!k || k.length < 2 || have.has(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 80)
    .map((it) => ({
      name: it.name.slice(0, 200),
      price: Number(it.price) || 0,
      category: snapImportedCategory(it.category),
      description: it.description ? it.description.slice(0, 300) : `Imported into ${vendor.store_name}`,
      image_url: it.imageUrl || '',
      stock_quantity: 10,
      vendor_id: vendor.id,
      is_active: false
    }));
  if (rows.length) {
    const { error: ie } = await a.from('products').insert(rows);
    if (ie) throw error(500, ie.message);
  }
  return rows.length;
}

// The universal "any website" path: headless render → if the DOM heuristic is weak, let Gemini
// vision read the products off the page's images. This is what makes a feedless SPA import.
async function deepWithVision(url: string): Promise<SocialItem[]> {
  let rendered: { name: string; price: number; imageUrl: string }[] = [];
  try {
    rendered = await renderAndExtract(url);
  } catch {
    rendered = [];
  }
  const base: SocialItem[] = rendered.map((r) => ({ name: r.name, price: r.price, imageUrl: r.imageUrl }));
  const good = base.filter((b) => b.name && b.name.length > 2 && b.price > 0);
  if (good.length >= 3) return base;
  // Heuristic weak → vision reads the rendered images (name + price-printed-on-image + category).
  const media = base.slice(0, 12).map((r) => ({ imageUrl: r.imageUrl, caption: r.name }));
  const vis = await extractProductsFromMedia(media);
  const seen = new Set<string>();
  const out: SocialItem[] = [];
  for (const it of [...vis, ...base]) {
    const k = String(it.name || '').toLowerCase().trim();
    if (!k || k.length < 2 || seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

export const POST: RequestHandler = async ({ request }) => {
  assertAdmin(request);
  const b = await request.json().catch(() => ({}) as any);
  const url = normalizeUrl(b?.url || '');
  const deep = Boolean(b?.deep);
  if (!/^https?:\/\/[^\s.]+\.[^\s]+/.test(url)) throw error(400, 'A valid website URL is required');
  const host = hostOf(url);

  // ── Facebook / Instagram: honest — Meta blocks URL scraping; guide to connect / website. ──
  if (/(?:^|\.)(?:facebook|fb)\.com$/.test(host) || /(?:^|\.)instagram\.com$/.test(host)) {
    const s = importFromSocial(url);
    return json({ ok: true, imported: 0, found: 0, note: s.note, source: s.source });
  }

  const a = adminClient();
  const origin = (() => {
    try {
      return new URL(url).origin;
    } catch {
      return url;
    }
  })();

  // ── find-or-create the store (vendor) for this site — idempotent by host. ──
  const { data: allV } = await a.from('vendors').select('id,store_name,website_url').not('website_url', 'is', null);
  let vendor = (allV || []).find((v: any) => host && hostOf(v.website_url) === host) as Vendor | undefined;

  let created = false;
  if (!vendor) {
    const store_name = String(b?.storeName || '').trim() || storeNameFromUrl(url);
    const emailSlug = (host || store_name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'store';
    const row = {
      store_name,
      owner_name: 'Imported',
      email: `import-${emailSlug}@snehalata.import`,
      status: 'approved',
      website_url: origin,
      description: `Imported from ${host || url}`,
      vendor_type: 'IMPORTED',
      commission_rate: 10
    };
    const { data: ins, error: ve } = await a
      .from('vendors')
      .insert(row)
      .select('id,store_name,website_url')
      .single();
    if (ve) throw error(500, 'Could not create the store: ' + ve.message);
    vendor = ins as Vendor;
    created = true;
  }

  let imported = 0;
  let found = 0;
  let diagnostics: any = null;
  let note: string | null = null;
  let source = 'structured';

  if (host === 'daraz.com.bd' || host.endsWith('.daraz.com.bd')) {
    // ── Daraz: embedded JSON, then headless+vision fallback. ──
    const d = await importFromDaraz(url);
    let items = d.items;
    source = d.source;
    if (items.length < 3) {
      const dv = await deepWithVision(url);
      if (dv.length > items.length) {
        items = dv;
        source = 'daraz+vision';
      }
    }
    found = items.length;
    imported = await insertItems(a, vendor, items);
    if (!imported) note = d.note || 'Could not read products from this Daraz page.';
  } else if (deep) {
    // ── Admin explicitly asked for deep render. ──
    const items = await deepWithVision(url);
    found = items.length;
    imported = await insertItems(a, vendor, items);
    source = 'deep+vision';
    if (!imported) note = 'Rendered the page but found no products — it may be login-walled or bot-blocked.';
  } else {
    // ── Structured engine first (Shopify / Woo / JSON-LD / sitemap / text-AI). ──
    try {
      const r = await syncVendor(a, { id: vendor.id, store_name: vendor.store_name, website_url: url });
      imported = r.imported || 0;
      found = r.found || 0;
      diagnostics = (r as any).diagnostics || null;
    } catch (e: any) {
      diagnostics = { note: e?.message || 'structured fetch failed' };
    }
    // ── Universal fallback (makes "any website" real): nothing structured → headless + vision. ──
    if (found === 0) {
      const items = await deepWithVision(url);
      found = items.length;
      imported += await insertItems(a, vendor, items);
      source = 'auto-deep+vision';
      if (!imported) {
        note =
          'No product feed found, and rendering the page turned up nothing importable — the site is likely login-walled or bot-blocked (e.g. a Cloudflare challenge).';
      }
    }
  }

  return json({
    ok: true,
    imported,
    found,
    diagnostics,
    note,
    source,
    vendor: { id: vendor.id, store_name: vendor.store_name, created }
  });
};
