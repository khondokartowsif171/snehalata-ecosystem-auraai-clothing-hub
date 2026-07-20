// WebMCP — expose Snehalata to in-browser AI agents (Gemini in Chrome, etc.) as callable tools.
// Instead of an agent guessing by clicking the UI, the site hands it real tools:
// search products, get details, and store info. Read-only + safe (no cart/checkout side effects).
//
// Origin trial: snehalata.com is registered for Chrome's WebMCP trial (valid to Nov 2026).
// Token is public by design (also injected as a <meta> so the trial activates for real users).
// API: document.modelContext.registerTool({name, description, inputSchema, execute}) — Chrome 149+.

const OT_TOKEN =
  'A2PTscw/e5YR6ij82M03Z1HyAeB+HE8NGgUwUOd5AVbAbE2zoosY87yxBkyL+X+EWgrlXO0F61KJNJbOE89YIAUAAAB0eyJvcmlnaW4iOiJodHRwczovL3NuZWhhbGF0YS5jb206NDQzIiwiZmVhdHVyZSI6IldlYk1DUCIsImV4cGlyeSI6MTc5NDg3MzYwMCwiaXNTdWJkb21haW4iOnRydWUsImlzVGhpcmRQYXJ0eSI6dHJ1ZX0=';

const BDT = (n: unknown) => '৳' + Number(n || 0).toLocaleString('en-US');
const link = (id: unknown) => `https://www.snehalata.com/product/${id}`;

function injectToken() {
  if (document.querySelector('meta[http-equiv="origin-trial"][data-webmcp]')) return;
  const m = document.createElement('meta');
  m.httpEquiv = 'origin-trial';
  m.content = OT_TOKEN;
  m.setAttribute('data-webmcp', '1');
  document.head.appendChild(m);
}

async function search(query: string, maxPrice?: number): Promise<any[]> {
  const r = await fetch('/api/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ q: query })
  });
  const d = await r.json().catch(() => ({}));
  let items: any[] = Array.isArray(d?.products) ? d.products : [];
  if (typeof maxPrice === 'number' && maxPrice > 0) items = items.filter((p) => Number(p.price) <= maxPrice);
  return items;
}

async function searchProducts(query: string, maxPrice?: number): Promise<string> {
  try {
    const items = (await search(query, maxPrice)).slice(0, 8);
    if (!items.length) return `No products found on Snehalata for "${query}".`;
    const lines = items.map((p, i) => `${i + 1}. ${p.name} — ${BDT(p.price)} — ${link(p.id)}`);
    return `Found ${items.length} product(s) on Snehalata for "${query}":\n${lines.join('\n')}`;
  } catch {
    return 'Could not search Snehalata right now — please try again.';
  }
}

async function productDetails(query: string): Promise<string> {
  try {
    const p = (await search(query))[0];
    if (!p) return `No matching product found on Snehalata for "${query}".`;
    const desc = (p.description || '').toString().slice(0, 240);
    return [
      `${p.name}`,
      `Price: ${BDT(p.price)}`,
      p.vendor ? `Store: ${p.vendor}` : '',
      desc ? `About: ${desc}` : '',
      `Buy: ${link(p.id)}`,
      `Payment: Cash on Delivery + online. Delivery across Bangladesh.`
    ].filter(Boolean).join('\n');
  } catch {
    return 'Could not fetch product details right now.';
  }
}

async function registerAll(mc: any) {
  await mc.registerTool({
    name: 'search_snehalata_products',
    description:
      'Search the Snehalata marketplace (Bangladesh) for products — clothing, sarees, panjabi, kurti, cosmetics, skincare and more. Returns matching products with name, price in BDT (taka), and a product link.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to search for, e.g. "green saree", "men panjabi", "lipstick"' },
        maxPrice: { type: 'number', description: 'Optional maximum price in BDT (taka)' }
      },
      required: ['query']
    },
    execute: async ({ query, maxPrice }: any) =>
      searchProducts(String(query || ''), typeof maxPrice === 'number' ? maxPrice : undefined)
  });

  await mc.registerTool({
    name: 'get_snehalata_product_details',
    description:
      'Get details of the best-matching single product on Snehalata for a query — name, price in BDT, store, short description, and a link to buy.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Product name or description' } },
      required: ['query']
    },
    execute: async ({ query }: any) => productDetails(String(query || ''))
  });

  await mc.registerTool({
    name: 'snehalata_store_info',
    description: 'How to buy on Snehalata: delivery coverage, payment options, ordering steps, and features.',
    inputSchema: { type: 'object', properties: {} },
    execute: async () =>
      'Snehalata (https://www.snehalata.com) is a Bangladeshi online marketplace with clothing, cosmetics and more from many local sellers. Payment: Cash on Delivery and online (SSLCommerz). Delivery: across Bangladesh. To order: open a product link, add to cart, then checkout with your name, phone and address. Bonus: AR virtual try-on for clothing and makeup.'
  });

  // eslint-disable-next-line no-console
  console.log('[WebMCP] Snehalata agent tools registered ✅');
}

let done = false;
export async function enableWebMcp() {
  if (done || typeof document === 'undefined') return;
  done = true;
  injectToken();
  // The API is gated behind the origin trial; after injecting the token give Chrome a moment,
  // then register. Retry a few times (browsers without the trial simply no-op).
  for (let i = 0; i < 6; i++) {
    const mc = (document as any).modelContext;
    if (mc && typeof mc.registerTool === 'function') {
      try {
        await registerAll(mc);
      } catch {
        /* trial inactive / API mismatch — ignore */
      }
      return;
    }
    await new Promise((r) => setTimeout(r, 700));
  }
}
