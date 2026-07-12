import { json, error } from '@sveltejs/kit';
import { adminClient } from '$lib/server/vendorSync';
import { initiatePayment, sslczConfigured } from '$lib/server/sslcommerz.server';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 30 };

// Start an SSLCommerz hosted-checkout for an existing (PENDING) order → returns the GatewayPageURL.
export const POST: RequestHandler = async ({ request, url }) => {
  if (!sslczConfigured()) throw error(400, 'অনলাইন পেমেন্ট এখনো চালু হয়নি (SSLCommerz key যোগ করা হয়নি)। এখন COD বা bKash/Nagad ব্যবহার করুন।');
  const b = await request.json().catch(() => ({}));
  const orderId = b?.orderId;
  if (!orderId) throw error(400, 'orderId required');

  const a = adminClient();
  const { data: o, error: e } = await a.from('orders').select('*').eq('id', orderId).single();
  if (e || !o) throw error(404, 'order not found');
  if (o.payment_status === 'PAID') return json({ ok: true, paid: true });

  const origin = url.origin;
  // tran_id carries the order id so the IPN can map back: SNH-<orderId>-<ts>
  const tranId = `SNH-${o.id}-${Date.now()}`;
  const r = await initiatePayment({
    tranId,
    amount: Number(o.total),
    customer: { name: o.customer_name, email: o.customer_email, phone: o.customer_phone, address: o.address, city: o.district },
    successUrl: `${origin}/api/payment/sslcommerz/ipn?redirect=success`,
    failUrl: `${origin}/api/payment/sslcommerz/ipn?redirect=fail`,
    cancelUrl: `${origin}/api/payment/sslcommerz/ipn?redirect=cancel`,
    ipnUrl: `${origin}/api/payment/sslcommerz/ipn`,
    productName: `Snehalata Order #${o.id}`
  });
  if (!r.ok) throw error(502, r.error || 'পেমেন্ট শুরু করা যায়নি');
  return json({ ok: true, gatewayUrl: r.gatewayUrl });
};
