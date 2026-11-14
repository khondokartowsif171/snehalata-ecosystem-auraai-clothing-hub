import { env } from '$env/dynamic/private';

/**
 * Aura Courier Logistics Hub Bridge
 * Direct production connector to Aura Courier MCP (https://courier.auraajenticai.cloud)
 * Handles Steadfast, Pathao, RedX, Paperfly, Auto-routing, and Vendor BYOK.
 */

const DEFAULT_MCP_ENDPOINT = 'https://courier.auraajenticai.cloud/mcp';
const DEFAULT_MCP_TOKEN = 'aura_live_mcp_master_key_2026';

export interface CourierRateComparison {
  success: boolean;
  zone: string;
  zone_title: string;
  distance_km?: number;
  road_distance_km?: number;
  weight_kg: number;
  cod_amount: number;
  recommended_courier: string;
  recommendation_reason: string;
  rates?: Array<{
    courier: string;
    delivery_fee: number;
    cod_fee: number;
    total_cost: number;
    sla_hours: { min: number; max: number };
    is_available: boolean;
  }>;
}

export interface ParcelCreateOptions {
  courier?: 'steadfast' | 'pathao' | 'redx' | 'paperfly' | 'auto' | 'auto_fastest' | 'auto_cheapest';
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
  item_weight?: number;
  dry_run?: boolean;
  byokHeaders?: Record<string, string>;
}

export interface ParcelCreateResult {
  success: boolean;
  courier: string;
  tracking_code: string;
  consignment_id?: string | number;
  invoice: string;
  status: string;
  delivery_fee?: number;
  cost_estimate_bdt?: number;
  routing_reason?: string;
}

export interface UniversalTrackingResult {
  success: boolean;
  tracking_code: string;
  courier?: string;
  status: string;
  current_location?: string;
  timeline?: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
}

/**
 * Invoke any tool on the central Aura Courier MCP instance
 */
export async function callAuraCourierTool<T = any>(
  toolName: string,
  args: Record<string, any> = {},
  byokHeaders: Record<string, string> = {}
): Promise<T> {
  const endpoint = env.AURA_COURIER_ENDPOINT || DEFAULT_MCP_ENDPOINT;
  const token = env.AURA_COURIER_TOKEN || DEFAULT_MCP_TOKEN;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...byokHeaders
  };

  const payload = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Aura Courier MCP request failed (${response.status}): ${errText}`);
  }

  const json = await response.json();
  if (json.error) {
    throw new Error(json.error.message || `Aura Courier MCP error: ${JSON.stringify(json.error)}`);
  }

  const result = json.result;
  if (result?.isError) {
    const msg = result.content?.[0]?.text || 'MCP tool execution reported error';
    throw new Error(msg);
  }

  const rawText = result?.content?.[0]?.text;
  if (!rawText) return result as T;

  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed === 'object') {
      if (parsed.ok === false && parsed.error?.message) {
        throw new Error(parsed.error.message);
      }
      if (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) {
        return { ...parsed, ...parsed.data } as T;
      }
    }
    return parsed as T;
  } catch (err: any) {
    if (err instanceof Error && !err.message.includes('JSON')) throw err;
    return rawText as unknown as T;
  }
}

/**
 * 1. List operational status of all Bangladeshi courier partners
 */
export async function listCouriers() {
  return callAuraCourierTool('list_couriers', {});
}

/**
 * 2. Compare live courier rates across Steadfast, Pathao, RedX, Paperfly
 */
export async function compareRates(opts: {
  recipient_address: string;
  cod_amount: number;
  item_weight?: number;
}): Promise<CourierRateComparison> {
  const res = await callAuraCourierTool<any>('compare_courier_rates', {
    recipient_address: opts.recipient_address,
    cod_amount: opts.cod_amount,
    weight_kg: opts.item_weight ?? 0.5
  });
  if (res && typeof res === 'object' && Array.isArray(res.quotes) && !res.rates) {
    res.rates = res.quotes.map((q: any) => ({
      courier: q.courier,
      courier_name: q.courier_name,
      delivery_fee: q.base_delivery_fee ?? q.delivery_fee ?? 0,
      cod_fee: q.cod_charge ?? q.cod_fee ?? 0,
      total_cost: q.total_cost ?? q.base_delivery_fee ?? 0,
      sla_hours: q.sla_hours || { min: 24, max: 48 },
      is_available: true
    }));
  }
  return res as CourierRateComparison;
}

function cleanBdPhone(raw: string): string {
  let digits = String(raw || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('880')) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith('1')) digits = '0' + digits;
  return digits;
}

/**
 * 3. Book and dispatch a parcel consignment with optional BYOK headers
 */
export async function createParcel(opts: ParcelCreateOptions): Promise<ParcelCreateResult> {
  return callAuraCourierTool<ParcelCreateResult>(
    'create_parcel',
    {
      courier: opts.courier || 'auto',
      invoice: opts.invoice,
      recipient_name: opts.recipient_name,
      recipient_phone: cleanBdPhone(opts.recipient_phone),
      recipient_address: opts.recipient_address,
      cod_amount: opts.cod_amount,
      note: opts.note || '',
      item_weight: opts.item_weight ?? 0.5,
      dry_run: Boolean(opts.dry_run)
    },
    opts.byokHeaders || {}
  );
}

/**
 * 4. Universal real-time parcel tracking
 */
export async function trackParcel(trackingCode: string): Promise<UniversalTrackingResult> {
  return callAuraCourierTool<UniversalTrackingResult>('track_parcel', {
    tracking_code: trackingCode
  });
}

/**
 * 5. Check customer delivery fraud risk
 */
export async function checkFraudRisk(phone: string, address: string) {
  return callAuraCourierTool('check_fraud_risk', {
    phone,
    address
  });
}
