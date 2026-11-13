import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminClient } from '$lib/server/vendorSync';
import { compareRates } from '$lib/server/auraCourierBridge.server';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 30 };

function assertAdmin(request: Request) {
  const pass = request.headers.get('x-admin-pass') ?? '';
  if (!env.ADMIN_PASSWORD || pass !== env.ADMIN_PASSWORD) throw error(401, 'Unauthorized');
}

/**
 * POST /api/admin/orders/rates
 * Returns live rate and SLA comparison across Steadfast, Pathao, RedX, Paperfly for a given order.
 */
export const POST: RequestHandler = async ({ request }) => {
  assertAdmin(request);
  const b = await request.json().catch(() => ({}));
  const orderId = b?.orderId;
  if (!orderId) throw error(400, 'orderId required');

  const a = adminClient();
  const { data: o, error: e } = await a.from('orders').select('*').eq('id', orderId).single();
  if (e || !o) throw error(404, 'order not found');

  const destinationAddress = `${o.address || ''}${o.area ? ', ' + o.area : ''}${o.district ? ', ' + o.district : ''}`.trim();
  const codAmount = o.payment_method === 'COD' && o.payment_status !== 'PAID' ? Number(o.total) || 0 : 0;

  try {
    const comparison = await compareRates({
      recipient_address: destinationAddress,
      cod_amount: codAmount,
      item_weight: Number(b?.item_weight) || 0.5
    });

    return json({
      ok: true,
      order: {
        id: o.id,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        address: destinationAddress,
        cod_amount: codAmount
      },
      comparison
    });
  } catch (err: any) {
    throw error(502, err?.message || 'Rate comparison failed');
  }
};
