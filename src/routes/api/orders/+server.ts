import { json, error } from '@sveltejs/kit';
import { adminClient } from '$lib/server/vendorSync';
import { encodeTracking } from '$lib/trackingCode';
import { readSiteConfig, normalizeCommission, computeAuraCommission } from '$lib/server/siteConfig.server';
import type { RequestHandler } from './$types';

const money = (n: number) => Math.round(n * 100) / 100;

// Public checkout: creates one order + per-vendor line items with commission/payout.
// A cart may mix vendors — the order is single (customer-facing) but split per item
// for vendor fulfillment + payout. Prices are re-read from the DB (never trust client).
export const POST: RequestHandler = async ({ request }) => {
  const b = await request.json();
  const c = b?.customer || {};
  const items = Array.isArray(b?.items) ? b.items : [];
  const pay = b?.payment || {};
  if (!c.name || !c.phone || !c.address) throw error(400, 'Name, phone and address are required');
  if (!items.length) throw error(400, 'Your cart is empty');

  const a = adminClient();
  const ids = [...new Set(items.map((i: any) => Number(i.id)).filter(Boolean))];
  const { data: prods } = await a.from('products').select('id,name,price,image_url,vendor_id').in('id', ids);
  const byId = new Map((prods || []).map((p: any) => [p.id, p]));

  const vids = [...new Set((prods || []).map((p: any) => p.vendor_id).filter(Boolean))];
  const { data: vends } = vids.length
    ? await a.from('vendors').select('id,commission_rate').in('id', vids)
    : { data: [] as any[] };

  // Pre-compute each valid line + each vendor's slice of THIS order (Aura Smart tiers on it).
  const vendorValue: Record<string, number> = {};
  const parsed = items
    .map((it: any) => {
      const p: any = byId.get(Number(it.id));
      if (!p) return null;
      const qty = Math.max(1, Number(it.quantity) || 1);
      const unit = Number(p.price);
      const line = money(unit * qty);
      if (p.vendor_id != null) vendorValue[String(p.vendor_id)] = (vendorValue[String(p.vendor_id)] || 0) + line;
      return { it, p, qty, unit, line };
    })
    .filter(Boolean) as any[];
  if (!parsed.length) throw error(400, 'No valid products in your cart');

  // Commission config (Storage-backed). mode 'aura' = Aura Smart decides every sale (6–11%);
  // mode 'fixed' = each vendor's own commission_rate (or base). For Aura mode, pull vendor
  // avg ratings (best-effort — a better-rated shop earns a lower rate).
  const cfg = normalizeCommission((await readSiteConfig()).commission);
  let ratingByVendor: Record<string, number> = {};
  if (cfg.mode === 'aura' && vids.length) {
    try {
      const { data: revs } = await a.from('reviews').select('vendor_id,rating').eq('status', 'PUBLISHED').in('vendor_id', vids);
      const agg: Record<string, { s: number; c: number }> = {};
      for (const r of revs || []) {
        const k = String(r.vendor_id);
        (agg[k] ??= { s: 0, c: 0 });
        agg[k].s += Number(r.rating) || 0;
        agg[k].c += 1;
      }
      ratingByVendor = Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, v.c ? v.s / v.c : 0]));
    } catch {
      /* reviews table absent → rating 0 */
    }
  }
  const rateFor = (vid: any): number => {
    const key = String(vid);
    if (cfg.mode === 'aura') return computeAuraCommission(cfg, vendorValue[key] || 0, ratingByVendor[key] || 0);
    const r = (vends || []).find((v: any) => v.id === vid)?.commission_rate;
    return r === null || r === undefined ? cfg.base : Number(r);
  };

  let subtotal = 0, commissionTotal = 0, payoutTotal = 0;
  const lineItems: any[] = [];
  for (const { it, p, qty, unit, line } of parsed) {
    const rate = rateFor(p.vendor_id);
    const commission = money((line * rate) / 100);
    const payout = money(line - commission);
    subtotal += line; commissionTotal += commission; payoutTotal += payout;
    // Chosen size is recorded on the item name so the vendor/admin see it (no schema change).
    const size = it.size ? String(it.size).slice(0, 8).replace(/[^\w-]/g, '') : '';
    lineItems.push({
      product_id: p.id, vendor_id: p.vendor_id, name: size ? `${p.name} · Size ${size}` : p.name, image_url: p.image_url,
      unit_price: unit, quantity: qty, line_total: line,
      commission_rate: rate, commission_amount: commission, vendor_payout: payout, item_status: 'PLACED'
    });
  }
  if (!lineItems.length) throw error(400, 'No valid products in your cart');

  const shipping = String(c.district || '').toLowerCase() === 'dhaka' ? 78 : 118;
  const total = money(subtotal + shipping);
  const method = ['COD', 'BKASH', 'NAGAD'].includes(pay.method) ? pay.method : 'COD';

  const { data: order, error: oe } = await a.from('orders').insert({
    customer_name: c.name, customer_phone: c.phone, customer_email: c.email || null,
    district: c.district || '', area: c.area || '', address: c.address, note: c.note || '',
    payment_method: method, payment_txid: pay.txid || null, payment_status: 'PENDING',
    subtotal: money(subtotal), shipping, total, status: 'PLACED',
    commission_total: money(commissionTotal), vendor_payout_total: money(payoutTotal)
  }).select().single();
  if (oe) throw error(500, oe.message);

  const { error: ie } = await a.from('order_items').insert(lineItems.map((li) => ({ ...li, order_id: order.id })));
  if (ie) throw error(500, ie.message);

  // Neural Grid A1 — record purchase events + bump product stats (best-effort; the
  // most reliable purchase signal since it's server-side and can't be missed/spoofed).
  try {
    await a.from('events').insert(
      lineItems.map((li) => ({
        event_type: 'purchase',
        product_id: li.product_id,
        vendor_id: li.vendor_id,
        session_id: `order:${order.id}`,
        meta: { order_id: order.id, qty: li.quantity, line_total: li.line_total }
      }))
    );
    await Promise.all(
      lineItems.map((li) =>
        a
          .rpc('bump_product_stats', {
            p_product_id: li.product_id,
            p_purchases: li.quantity,
            p_revenue: li.line_total
          })
          .then(() => {}, () => {})
      )
    );
  } catch {
    // Grid tables not migrated yet — order still succeeds.
  }

  // A6 governance — COD-fraud risk score (fast heuristic; best-effort). Surfaced
  // to the admin so risky COD orders can be confirmed by phone before dispatch.
  try {
    let score = 0;
    const reasons: string[] = [];
    if (method === 'COD') { score += 25; reasons.push('COD'); }
    if (!c.email) { score += 15; reasons.push('no email'); }
    if (String(c.address || '').trim().length < 20) { score += 20; reasons.push('short address'); }
    if (method === 'COD' && total > 5000) { score += 20; reasons.push('high-value COD'); }
    const { data: prior } = await a
      .from('orders')
      .select('id,status')
      .eq('customer_phone', c.phone)
      .neq('id', order.id);
    if ((prior || []).some((o: any) => String(o.status).toUpperCase() === 'DELIVERED')) {
      score -= 25; reasons.push('returning buyer');
    }
    if ((prior || []).length >= 3) { score += 10; reasons.push('high velocity'); }
    score = Math.max(0, Math.min(100, score));
    await a.from('orders').update({ fraud_score: score, fraud_reason: reasons.join(', ') }).eq('id', order.id);
  } catch {
    // fraud columns not migrated yet — order still succeeds.
  }

  return json({ ok: true, orderId: order.id, tracking: encodeTracking(order.id, new Date(order.created_at || Date.now())), total, itemCount: lineItems.length });
};
