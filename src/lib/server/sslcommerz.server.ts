import { env } from '$env/dynamic/private';

// SSLCommerz — Bangladesh's payment gateway (bKash, Nagad, Rocket, cards, net-banking in ONE
// integration). store_id / store_password come from the SSLCommerz merchant panel. Sandbox is
// used until SSLCZ_SANDBOX==='false'. Amounts are always taken server-side (never trust client).
const isSandbox = () => String(env.SSLCZ_SANDBOX ?? 'true') !== 'false';
const base = () => (isSandbox() ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com');

export const sslczConfigured = () => !!(env.SSLCZ_STORE_ID && env.SSLCZ_STORE_PASSWORD);

export type InitResult = { ok: boolean; gatewayUrl?: string; error?: string };

// Start a hosted-checkout session → returns the GatewayPageURL to redirect the buyer to.
export async function initiatePayment(p: {
  tranId: string;
  amount: number;
  customer: { name?: string; email?: string; phone?: string; address?: string; city?: string };
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
  productName?: string;
}): Promise<InitResult> {
  if (!sslczConfigured()) return { ok: false, error: 'SSLCommerz not configured' };
  const form = new URLSearchParams({
    store_id: env.SSLCZ_STORE_ID as string,
    store_passwd: env.SSLCZ_STORE_PASSWORD as string,
    total_amount: String(Math.round(Number(p.amount) || 0)),
    currency: 'BDT',
    tran_id: p.tranId,
    success_url: p.successUrl,
    fail_url: p.failUrl,
    cancel_url: p.cancelUrl,
    ipn_url: p.ipnUrl,
    shipping_method: 'NO',
    product_name: (p.productName || 'Snehalata Order').slice(0, 60),
    product_category: 'Clothing',
    product_profile: 'physical-goods',
    cus_name: p.customer.name || 'Customer',
    cus_email: p.customer.email || 'customer@snehalata.com',
    cus_add1: p.customer.address || 'N/A',
    cus_city: p.customer.city || 'Dhaka',
    cus_country: 'Bangladesh',
    cus_phone: p.customer.phone || 'N/A'
  });
  try {
    const res = await fetch(`${base()}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    const d = await res.json().catch(() => ({}));
    if (d?.status === 'SUCCESS' && d?.GatewayPageURL) return { ok: true, gatewayUrl: d.GatewayPageURL };
    return { ok: false, error: d?.failedreason || 'SSLCommerz init failed' };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'SSLCommerz init error' };
  }
}

// Validate a payment via val_id (from the success callback / IPN). Confirms it truly settled.
export async function validatePayment(valId: string): Promise<{ valid: boolean; tranId?: string; amount?: number; bankTranId?: string }> {
  if (!sslczConfigured() || !valId) return { valid: false };
  try {
    const u = new URL(`${base()}/validator/api/validationserverAPI.php`);
    u.searchParams.set('val_id', valId);
    u.searchParams.set('store_id', env.SSLCZ_STORE_ID as string);
    u.searchParams.set('store_passwd', env.SSLCZ_STORE_PASSWORD as string);
    u.searchParams.set('format', 'json');
    const res = await fetch(u.toString());
    const d = await res.json().catch(() => ({}));
    const valid = d?.status === 'VALID' || d?.status === 'VALIDATED';
    return { valid, tranId: d?.tran_id, amount: d?.amount != null ? Number(d.amount) : undefined, bankTranId: d?.bank_tran_id };
  } catch {
    return { valid: false };
  }
}
