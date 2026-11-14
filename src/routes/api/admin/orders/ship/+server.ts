import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminClient } from '$lib/server/vendorSync';
import { encodeTracking } from '$lib/trackingCode';
import { createParcel, compareRates, type ParcelCreateOptions } from '$lib/server/auraCourierBridge.server';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 30 };

function assertAdmin(request: Request) {
  const pass = request.headers.get('x-admin-pass') ?? '';
  if (!env.ADMIN_PASSWORD || pass !== env.ADMIN_PASSWORD) throw error(401, 'Unauthorized');
}

/**
 * POST /api/admin/orders/ship
 * Dispatches an order consignment via Aura Courier MCP (Steadfast, Pathao, RedX, Paperfly, or Auto).
 * Supports both Snehalata Central Account and Vendor BYOK.
 */
export const POST: RequestHandler = async ({ request }) => {
  assertAdmin(request);
  const b = await request.json().catch(() => ({}));
  const orderId = b?.orderId;
  const targetCourier = (b?.courier || 'auto').toLowerCase();
  const dryRun = Boolean(b?.dry_run);
  if (!orderId) throw error(400, 'orderId required');

  const a = adminClient();
  const { data: o, error: e } = await a
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  if (e || !o) throw error(404, 'order not found');
  if (o.courier_tracking_code && !dryRun) {
    return json({
      ok: true,
      tracking_code: o.courier_tracking_code,
      courier: o.courier_provider || 'booked',
      note: 'already booked'
    });
  }

  // COD orders collect the full total; prepaid (PAID) orders collect 0.
  const codAmount = o.payment_method === 'COD' && o.payment_status !== 'PAID' ? Number(o.total) || 0 : 0;
  const invoice = encodeTracking(o.id, new Date(o.created_at || Date.now()));

  // Resolve vendor BYOK headers or custom pickup if specified
  const byokHeaders: Record<string, string> = {};
  let pickupAddressNote = '';

  const vendorId = o.order_items?.[0]?.vendor_id;
  if (vendorId && b?.use_vendor_byok) {
    try {
      const { data: vend } = await a
        .from('vendors')
        .select('store_name, district, area, phone, description')
        .eq('id', vendorId)
        .maybeSingle();

      let meta: any = null;
      if (vend?.description && vend.description.includes('__COURIER_CONFIG__:')) {
        try {
          meta = JSON.parse(vend.description.split('__COURIER_CONFIG__:')[1]);
        } catch {}
      }
      meta = meta || (vend as any)?.metadata || {};
      const courierKeys = meta.courier_keys || {};
      if (courierKeys.steadfast_api_key) byokHeaders['x-steadfast-api-key'] = courierKeys.steadfast_api_key;
      if (courierKeys.steadfast_secret_key) byokHeaders['x-steadfast-secret-key'] = courierKeys.steadfast_secret_key;
      if (courierKeys.pathao_client_id) byokHeaders['x-pathao-client-id'] = courierKeys.pathao_client_id;
      if (courierKeys.pathao_client_secret) byokHeaders['x-pathao-client-secret'] = courierKeys.pathao_client_secret;
      if (courierKeys.redx_api_token) byokHeaders['x-redx-api-token'] = courierKeys.redx_api_token;
      if (courierKeys.redx_store_id) byokHeaders['x-redx-pickup-store-id'] = courierKeys.redx_store_id;
      if (courierKeys.paperfly_api_key) byokHeaders['x-paperfly-api-key'] = courierKeys.paperfly_api_key;
      if (courierKeys.paperfly_username) byokHeaders['x-paperfly-username'] = courierKeys.paperfly_username;
      if (courierKeys.paperfly_password) byokHeaders['x-paperfly-password'] = courierKeys.paperfly_password;

      if (meta.pickup_hub?.address) {
        pickupAddressNote = ` [Pickup: ${meta.pickup_hub.address}, Phone: ${meta.pickup_hub.phone || ''}]`;
      }
    } catch {
      /* ignore vendor metadata fetch failure */
    }
  }

  const destinationAddress = `${o.address || ''}${o.area ? ', ' + o.area : ''}${o.district ? ', ' + o.district : ''}`.trim();
  const deliveryNote = `${o.note || ''}${pickupAddressNote}`.trim();

  let cons;
  try {
    cons = await createParcel({
      courier: targetCourier,
      invoice,
      recipient_name: o.customer_name,
      recipient_phone: o.customer_phone,
      recipient_address: destinationAddress,
      cod_amount: codAmount,
      note: deliveryNote,
      item_weight: Number(b?.item_weight) || 0.5,
      dry_run: dryRun,
      byokHeaders
    });
  } catch (err: any) {
    throw error(502, err?.message || 'Aura Courier MCP booking failed');
  }

  if (dryRun) {
    return json({ ok: true, dry_run: true, result: cons });
  }

  // Persist courier fields + move order & line items to SHIPPED
  try {
    await a
      .from('orders')
      .update({
        courier_provider: cons.courier || targetCourier,
        courier_consignment_id: cons.consignment_id != null ? String(cons.consignment_id) : null,
        courier_tracking_code: cons.tracking_code || null,
        courier_status: cons.status || 'in_review',
        status: 'SHIPPED'
      })
      .eq('id', orderId);
    await a.from('order_items').update({ item_status: 'SHIPPED' }).eq('order_id', orderId);
  } catch {
    try {
      await a.from('orders').update({ status: 'SHIPPED' }).eq('id', orderId);
    } catch {
      /* ignore schema mismatch */
    }
  }

  return json({
    ok: true,
    courier: cons.courier || targetCourier,
    consignment_id: cons.consignment_id,
    tracking_code: cons.tracking_code,
    status: cons.status,
    delivery_fee: cons.delivery_fee,
    cost_estimate_bdt: cons.cost_estimate_bdt,
    routing_reason: cons.routing_reason
  });
};
