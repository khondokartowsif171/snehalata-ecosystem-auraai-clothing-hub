import { json, error } from '@sveltejs/kit';
import { adminClient } from '$lib/server/vendorSync';
import { encodeTracking } from '$lib/trackingCode';
import { createParcel } from '$lib/server/auraCourierBridge.server';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 30 };

async function vendorFromToken(request: Request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) throw error(401, 'Missing vendor session');
  const admin = adminClient();
  const { data: u, error: e } = await admin.auth.getUser(token);
  if (e || !u?.user?.email) throw error(401, 'Session expired — please sign in again');
  const { data: vend } = await admin.from('vendors').select('id, store_name, metadata').eq('email', u.user.email).single();
  if (!vend) throw error(403, 'No vendor node linked to this account');
  return { admin, vend };
}

/**
 * POST /api/vendor/orders/ship
 * Dispatches an order item using the vendor's own connected courier (BYOK).
 * Rider picks up from the vendor's warehouse; COD proceeds go to the vendor's courier account.
 */
export const POST: RequestHandler = async ({ request }) => {
  const { admin, vend } = await vendorFromToken(request);
  const b = await request.json().catch(() => ({}));
  const itemId = b?.itemId;
  const chosenCourier = (b?.courier || vend.metadata?.preferred_courier || 'steadfast').toLowerCase();

  if (!itemId) throw error(400, 'itemId required');

  // Verify line item ownership
  const { data: it, error: ie } = await admin
    .from('order_items')
    .select('*, orders(*)')
    .eq('id', itemId)
    .single();

  if (ie || !it) throw error(404, 'Order item not found');
  if (it.vendor_id !== vend.id) throw error(403, 'Not authorized for this order item');

  const o = it.orders;
  if (!o) throw error(404, 'Parent order not found');

  if (o.courier_tracking_code) {
    return json({
      ok: true,
      tracking_code: o.courier_tracking_code,
      courier: o.courier_provider || 'booked',
      note: 'already booked'
    });
  }

  // Check vendor BYOK credentials
  const meta = vend.metadata || {};
  const keys = meta.courier_keys || {};
  const byokHeaders: Record<string, string> = {};

  if (chosenCourier === 'steadfast') {
    if (!keys.steadfast_api_key || !keys.steadfast_secret_key) {
      throw error(400, 'আপনার Steadfast API Key ও Secret Key সেট করা নেই। ড্যাশবোর্ডের কুরিয়ার সেটিংস থেকে আগে কি (Key) যোগ করুন।');
    }
    byokHeaders['x-steadfast-api-key'] = keys.steadfast_api_key;
    byokHeaders['x-steadfast-secret-key'] = keys.steadfast_secret_key;
  } else if (chosenCourier === 'pathao') {
    if (!keys.pathao_client_id || !keys.pathao_client_secret) {
      throw error(400, 'আপনার Pathao Client ID ও Secret সেট করা নেই। ড্যাশবোর্ডের কুরিয়ার সেটিংস থেকে আগে কি (Key) যোগ করুন।');
    }
    byokHeaders['x-pathao-client-id'] = keys.pathao_client_id;
    byokHeaders['x-pathao-client-secret'] = keys.pathao_client_secret;
  } else if (chosenCourier === 'redx') {
    if (!keys.redx_api_token) {
      throw error(400, 'আপনার RedX API Token সেট করা নেই। ড্যাশবোর্ডের কুরিয়ার সেটিংস থেকে আগে টোকেন যোগ করুন।');
    }
    byokHeaders['x-redx-api-token'] = keys.redx_api_token;
  } else if (chosenCourier === 'paperfly') {
    if (!keys.paperfly_api_key) {
      throw error(400, 'আপনার Paperfly API Key সেট করা নেই। ড্যাশবোর্ডের কুরিয়ার সেটিংস থেকে আগে কি (Key) যোগ করুন।');
    }
    byokHeaders['x-paperfly-api-key'] = keys.paperfly_api_key;
  } else {
    throw error(400, 'অসমর্থিত কুরিয়ার সার্ভিস নির্বাচন করা হয়েছে।');
  }

  const codAmount = o.payment_method === 'COD' && o.payment_status !== 'PAID' ? Number(it.line_total || o.total) || 0 : 0;
  const invoice = encodeTracking(o.id, new Date(o.created_at || Date.now()));

  const pickupHub = meta.pickup_hub || {};
  const pickupNote = pickupHub.address ? ` [Pickup: ${pickupHub.address}, Phone: ${pickupHub.phone || ''}]` : '';
  const destinationAddress = `${o.address || ''}${o.area ? ', ' + o.area : ''}${o.district ? ', ' + o.district : ''}`.trim();
  const deliveryNote = `${o.note || ''}${pickupNote}`.trim();

  let cons;
  try {
    cons = await createParcel({
      courier: chosenCourier,
      invoice,
      recipient_name: o.customer_name,
      recipient_phone: o.customer_phone,
      recipient_address: destinationAddress,
      cod_amount: codAmount,
      note: deliveryNote,
      item_weight: 0.5,
      byokHeaders
    });
  } catch (err: any) {
    throw error(502, err?.message || 'ভেন্ডর কুরিয়ারে বুকিং ব্যর্থ হয়েছে');
  }

  // Update order and item status in database
  try {
    await admin
      .from('orders')
      .update({
        courier_provider: cons.courier || chosenCourier,
        courier_consignment_id: cons.consignment_id != null ? String(cons.consignment_id) : null,
        courier_tracking_code: cons.tracking_code || null,
        courier_status: cons.status || 'in_review',
        status: 'SHIPPED'
      })
      .eq('id', o.id);

    await admin.from('order_items').update({ item_status: 'SHIPPED' }).eq('id', itemId);
  } catch {
    try {
      await admin.from('orders').update({ status: 'SHIPPED' }).eq('id', o.id);
      await admin.from('order_items').update({ item_status: 'SHIPPED' }).eq('id', itemId);
    } catch {
      /* ignore schema mismatch */
    }
  }

  return json({
    ok: true,
    courier: cons.courier || chosenCourier,
    consignment_id: cons.consignment_id,
    tracking_code: cons.tracking_code,
    status: cons.status,
    delivery_fee: cons.delivery_fee,
    cost_estimate_bdt: cons.cost_estimate_bdt
  });
};
