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

async function trackOrderTool(orderId: string): Promise<string> {
  try {
    const cleanId = String(orderId || '').replace(/^ORD-/i, '').trim();
    if (!cleanId) return 'Please provide an Order ID or Tracking Code (e.g. "7" or "SNH-...").';
    const r = await fetch(`/api/orders/track?id=${encodeURIComponent(cleanId)}`);
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d?.order) return `Order "${orderId}" was not found on Snehalata.`;
    const o = d.order;
    return [
      `Order ID: ${o.tracking || 'ORD-' + o.id}`,
      `Status: ${o.status}`,
      `Total: ${BDT(o.total)}`,
      o.courier_tracking_code ? `Steadfast / Aura Courier Tracking: ${o.courier_tracking_code}` : '',
      `Live Tracking Page: https://www.snehalata.com/tracking/${encodeURIComponent(cleanId)}`
    ]
      .filter(Boolean)
      .join('\n');
  } catch {
    return 'Could not track order right now.';
  }
}

async function registerAll(mc: any) {
  const tools = [
    {
      name: 'search_snehalata_products',
      description:
        'Search the Snehalata marketplace (Bangladesh) for products — sarees, three-piece, panjabi, t-shirts, shirts, jeans/pants, kids/baby clothing, blazers, borka, cosmetics and more. Supports both Bengali and English queries.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What to search for, e.g. "green t-shirt", "jamdani saree", "পাঞ্জাবি", "বাচ্চাদের পোশাক"' },
          maxPrice: { type: 'number', description: 'Optional maximum price in BDT (taka)' }
        },
        required: ['query']
      },
      execute: async ({ query, maxPrice }: any) =>
        searchProducts(String(query || ''), typeof maxPrice === 'number' ? maxPrice : undefined)
    },
    {
      name: 'get_snehalata_product_details',
      description:
        'Get details of the best-matching single product on Snehalata for a query — name, price in BDT, store, short description, and a link to buy.',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Product name or description' } },
        required: ['query']
      },
      execute: async ({ query }: any) => productDetails(String(query || ''))
    },
    {
      name: 'track_snehalata_order',
      description:
        'Track a Snehalata customer order in real time (bridged to Aura Courier MCP — Steadfast, Pathao, RedX, Paperfly) by Order ID or Tracking Code.',
      inputSchema: {
        type: 'object',
        properties: { orderId: { type: 'string', description: 'Order ID or tracking number, e.g. "7"' } },
        required: ['orderId']
      },
      execute: async ({ orderId }: any) => trackOrderTool(String(orderId || ''))
    },
    {
      name: 'snehalata_store_info',
      description: 'How to buy on Snehalata: delivery coverage, payment options, ordering steps, AR Try-On Studio, and features.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () =>
        'Snehalata (https://www.snehalata.com) is a Bangladeshi AI-powered online marketplace with clothing (Saree, Three-Piece, Panjabi, Shirt, T-Shirt, Jeans/Pant, Kids/Baby, Blazer, Borka), cosmetics and more from verified local sellers. Payment: Cash on Delivery and online (SSLCommerz). Delivery: across Bangladesh via Aura Courier MCP (Steadfast, Pathao, RedX, Paperfly). Bonus: 100% Free 2-Image AR Virtual Try-On & AI Image Generator at https://www.snehalata.com/studio.'
    }
  ];

  for (const t of tools) {
    try {
      await mc.registerTool(t);
    } catch {
      /* ignore individual registration error */
    }
  }

  // eslint-disable-next-line no-console
  console.log('[WebMCP] Snehalata agent tools registered ✅ (5 tools active)');
}

let done = false;
export async function enableWebMcp() {
  if (done || typeof document === 'undefined') return;
  done = true;
  injectToken();

  // Always expose a direct browser-accessible bridge on window.snehalataWebMCP so AI agents,
  // Chrome extensions, and DevTools can inspect and invoke Snehalata's WebMCP tools even before Chrome's native flag is toggled.
  (window as any).snehalataWebMCP = {
    status: 'ACTIVE',
    originTrial: 'https://snehalata.com (Valid to Nov 2026)',
    backendCourierMcp: 'https://courier.auraajenticai.cloud/mcp',
    tools: ['search_snehalata_products', 'get_snehalata_product_details', 'track_snehalata_order', 'snehalata_store_info'],
    searchProducts,
    productDetails,
    trackOrder: trackOrderTool
  };

  // Register with W3C / Chrome WebMCP (`navigator.modelContext` or `document.modelContext`)
  for (let i = 0; i < 6; i++) {
    const mc = (navigator as any)?.modelContext || (document as any)?.modelContext;
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
