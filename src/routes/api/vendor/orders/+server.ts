import { json, error } from '@sveltejs/kit';
import { adminClient } from '$lib/server/vendorSync';
import { encodeTracking } from '$lib/trackingCode';
import type { RequestHandler } from './$types';

async function vendorFromToken(request: Request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) throw error(401, 'Missing vendor session');
  const admin = adminClient();
  const { data: u, error: e } = await admin.auth.getUser(token);
  if (e || !u?.user?.email) throw error(401, 'Session expired — please sign in again');
  const { data: vend } = await admin.from('vendors').select('id, store_name').eq('email', u.user.email).single();
  if (!vend) throw error(403, 'No vendor node linked to this account');
  return { admin, vend };
}

// A vendor's own order line-items (with the parent order's customer/shipping info)
// and their payout after snehalata's commission.
export const GET: RequestHandler = async ({ request }) => {
  const { admin, vend } = await vendorFromToken(request);
  const { data, error: e } = await admin
    .from('order_items')
    .select('*, orders(id, customer_name, customer_phone, district, area, address, note, status, payment_method, payment_status, created_at)')
    .eq('vendor_id', vend.id)
    .order('id', { ascending: false });
  if (e) throw error(500, e.message);

  // Best-effort attach courier tracking fields if migrated on orders table
  const orderIds = [...new Set((data || []).map((it: any) => it.order_id || it.orders?.id).filter(Boolean))];
  const courierMap: Record<string, { courier_tracking_code?: string | null; courier_status?: string | null }> = {};
  if (orderIds.length) {
    try {
      const { data: cs } = await admin
        .from('orders')
        .select('id, courier_tracking_code, courier_status')
        .in('id', orderIds);
      for (const c of cs || []) {
        courierMap[String(c.id)] = {
          courier_tracking_code: c.courier_tracking_code ?? null,
          courier_status: c.courier_status ?? null
        };
      }
    } catch {
      /* courier_* columns absent — ignore cleanly */
    }
  }

  const enriched = (data || []).map((it: any) => {
    const o = it.orders ? { ...it.orders, ...(courierMap[String(it.orders.id)] || {}) } : null;
    const tracking = o?.id ? encodeTracking(o.id, new Date(o.created_at || Date.now())) : '';
    return { ...it, orders: o, tracking };
  });

  return json({ ok: true, items: enriched });
};

// Vendor updates the fulfillment status of their own line-item.
export const PATCH: RequestHandler = async ({ request, url }) => {
  const { admin, vend } = await vendorFromToken(request);
  const id = url.searchParams.get('id');
  if (!id) throw error(400, 'id query param required');
  const { status } = await request.json();
  if (!status) throw error(400, 'status required');
  const { data: existing } = await admin.from('order_items').select('vendor_id').eq('id', id).single();
  if (!existing || existing.vendor_id !== vend.id) throw error(403, 'Not your order item');
  const { error: e } = await admin.from('order_items').update({ item_status: String(status) }).eq('id', id);
  if (e) throw error(500, e.message);
  return json({ ok: true });
};
