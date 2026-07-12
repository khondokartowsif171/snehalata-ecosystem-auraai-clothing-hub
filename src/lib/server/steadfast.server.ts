import { env } from '$env/dynamic/private';

// Steadfast Courier (packzy) API — book consignments + read delivery status. The merchant's
// Api-Key / Secret-Key come from the Steadfast portal (owner-provided, set as Vercel env).
// Docs: https://portal.packzy.com/api/v1  (headers: Api-Key, Secret-Key, Content-Type: application/json)
const BASE = 'https://portal.packzy.com/api/v1';

export const steadfastConfigured = () => !!(env.STEADFAST_API_KEY && env.STEADFAST_SECRET_KEY);

function headers() {
  return {
    'Api-Key': env.STEADFAST_API_KEY || '',
    'Secret-Key': env.STEADFAST_SECRET_KEY || '',
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
}

export type Consignment = {
  consignment_id?: number | string;
  tracking_code?: string;
  status?: string;
};

// Create a single consignment. cod_amount = amount to COLLECT on delivery (0 for prepaid orders).
export async function createConsignment(p: {
  invoice: string;
  name: string;
  phone: string;
  address: string;
  cod_amount: number;
  note?: string;
}): Promise<Consignment> {
  if (!steadfastConfigured()) throw new Error('Steadfast API keys not configured');
  const res = await fetch(`${BASE}/create_order`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      invoice: p.invoice,
      recipient_name: String(p.name || '').slice(0, 100),
      recipient_phone: String(p.phone || '').replace(/[^0-9]/g, '').slice(0, 11),
      recipient_address: String(p.address || '').slice(0, 250),
      cod_amount: Math.max(0, Math.round(Number(p.cod_amount) || 0)),
      note: String(p.note || '').slice(0, 250)
    })
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || (d.status && Number(d.status) >= 400)) {
    throw new Error(d?.message || `Steadfast create_order failed (${res.status})`);
  }
  const c = d.consignment || d;
  return { consignment_id: c.consignment_id, tracking_code: c.tracking_code, status: c.status };
}

// Current delivery status for a tracking code (pending / delivered / cancelled / partial_delivered…).
export async function getDeliveryStatus(trackingCode: string): Promise<string | null> {
  if (!steadfastConfigured() || !trackingCode) return null;
  try {
    const res = await fetch(`${BASE}/status_by_trackingcode/${encodeURIComponent(trackingCode)}`, { headers: headers() });
    const d = await res.json().catch(() => ({}));
    return d?.delivery_status || d?.status || null;
  } catch {
    return null;
  }
}

// Current courier wallet balance (sanity / admin).
export async function getBalance(): Promise<number | null> {
  if (!steadfastConfigured()) return null;
  try {
    const res = await fetch(`${BASE}/get_balance`, { headers: headers() });
    const d = await res.json().catch(() => ({}));
    const b = d?.current_balance ?? d?.balance;
    return b == null ? null : Number(b);
  } catch {
    return null;
  }
}
