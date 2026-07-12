import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminClient } from '$lib/server/vendorSync';
import { encodeTracking } from '$lib/trackingCode';
import { createConsignment, steadfastConfigured } from '$lib/server/steadfast.server';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 30 };

function assertAdmin(request: Request) {
  const pass = request.headers.get('x-admin-pass') ?? '';
  if (!env.ADMIN_PASSWORD || pass !== env.ADMIN_PASSWORD) throw error(401, 'Unauthorized');
}

// Book a Steadfast consignment for an order, store the tracking code, and mark it SHIPPED.
export const POST: RequestHandler = async ({ request }) => {
  assertAdmin(request);
  if (!steadfastConfigured()) throw error(400, 'Steadfast API keys নেই — Vercel env-এ STEADFAST_API_KEY + STEADFAST_SECRET_KEY যোগ করুন।');
  const b = await request.json().catch(() => ({}));
  const orderId = b?.orderId;
  if (!orderId) throw error(400, 'orderId required');

  const a = adminClient();
  const { data: o, error: e } = await a.from('orders').select('*').eq('id', orderId).single();
  if (e || !o) throw error(404, 'order not found');
  if (o.courier_tracking_code) return json({ ok: true, tracking_code: o.courier_tracking_code, note: 'already booked' });

  // COD orders collect the full total; prepaid (PAID) orders collect 0.
  const codAmount = o.payment_method === 'COD' && o.payment_status !== 'PAID' ? Number(o.total) || 0 : 0;
  const invoice = encodeTracking(o.id, new Date(o.created_at || Date.now()));

  let cons;
  try {
    cons = await createConsignment({
      invoice,
      name: o.customer_name,
      phone: o.customer_phone,
      address: `${o.address || ''}${o.area ? ', ' + o.area : ''}${o.district ? ', ' + o.district : ''}`.trim(),
      cod_amount: codAmount,
      note: o.note || ''
    });
  } catch (err: any) {
    throw error(502, err?.message || 'Steadfast booking failed');
  }

  // Persist courier fields + move the order to SHIPPED (degrades if columns are absent).
  try {
    await a
      .from('orders')
      .update({
        courier_consignment_id: cons.consignment_id != null ? String(cons.consignment_id) : null,
        courier_tracking_code: cons.tracking_code || null,
        courier_status: cons.status || 'in_review',
        status: 'SHIPPED'
      })
      .eq('id', orderId);
    await a.from('order_items').update({ item_status: 'SHIPPED' }).eq('order_id', orderId);
  } catch {
    // courier_* columns not migrated — still return the booking result
    try { await a.from('orders').update({ status: 'SHIPPED' }).eq('id', orderId); } catch { /* ignore */ }
  }

  return json({ ok: true, consignment_id: cons.consignment_id, tracking_code: cons.tracking_code, status: cons.status });
};
