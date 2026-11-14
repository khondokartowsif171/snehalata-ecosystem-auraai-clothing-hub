import { json, error } from '@sveltejs/kit';
import { adminClient } from '$lib/server/vendorSync';
import type { RequestHandler } from './$types';

function extractVendorMeta(vend: any) {
  let meta = vend?.metadata;
  if (!meta && vend?.description && vend.description.includes('__COURIER_CONFIG__:')) {
    try {
      const raw = vend.description.split('__COURIER_CONFIG__:')[1];
      meta = JSON.parse(raw);
    } catch {}
  }
  return meta || {};
}

async function vendorFromToken(request: Request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) throw error(401, 'Missing vendor session');
  const admin = adminClient();
  const { data: u, error: e } = await admin.auth.getUser(token);
  if (e || !u?.user?.email) throw error(401, 'Session expired — please sign in again');

  // Step 1: Identify vendor by session email using rock-solid core columns
  const { data: vend } = await admin
    .from('vendors')
    .select('id, store_name')
    .eq('email', u.user.email)
    .single();

  if (!vend) throw error(403, 'No vendor node linked to this account');

  // Step 2: Fetch extra vendor details by ID (safe from schema drift)
  let extra: any = {};
  try {
    const { data: d } = await admin
      .from('vendors')
      .select('district, area, phone, description')
      .eq('id', vend.id)
      .maybeSingle();
    if (d) extra = d;
  } catch {}

  return { admin, vend: { ...vend, ...extra } };
}

/**
 * GET /api/vendor/courier
 * Returns vendor's configured pickup hub and courier status (keys are masked).
 */
export const GET: RequestHandler = async ({ request }) => {
  const { vend } = await vendorFromToken(request);
  const meta = extractVendorMeta(vend);
  const hub = meta.pickup_hub || {
    address: meta.pickup_address || '',
    district: vend.district || '',
    area: vend.area || '',
    phone: vend.phone || ''
  };
  const keys = meta.courier_keys || {};

  return json({
    ok: true,
    pickup_hub: hub,
    preferred_courier: meta.preferred_courier || 'steadfast',
    configured_couriers: {
      steadfast: Boolean(keys.steadfast_api_key && keys.steadfast_secret_key),
      pathao: Boolean(keys.pathao_client_id && keys.pathao_client_secret),
      redx: Boolean(keys.redx_api_token),
      paperfly: Boolean(keys.paperfly_api_key && keys.paperfly_username && keys.paperfly_password)
    },
    // Masked hints for UI
    key_hints: {
      steadfast_api_key: keys.steadfast_api_key ? `***${keys.steadfast_api_key.slice(-4)}` : '',
      pathao_client_id: keys.pathao_client_id ? `***${keys.pathao_client_id.slice(-4)}` : '',
      redx_api_token: keys.redx_api_token ? `***${keys.redx_api_token.slice(-4)}` : '',
      redx_store_id: keys.redx_store_id || '',
      paperfly_api_key: keys.paperfly_api_key ? `***${keys.paperfly_api_key.slice(-4)}` : '',
      paperfly_username: keys.paperfly_username || ''
    }
  });
};

/**
 * POST /api/vendor/courier
 * Saves or updates vendor's pickup warehouse address and BYOK courier keys.
 */
export const POST: RequestHandler = async ({ request }) => {
  const { admin, vend } = await vendorFromToken(request);
  const b = await request.json().catch(() => ({}));

  const existingMeta = extractVendorMeta(vend);
  const existingKeys = existingMeta.courier_keys || {};

  // Preserve existing keys if user leaves them blank or masked
  const newKeys = { ...existingKeys };
  if (b.steadfast_api_key && !b.steadfast_api_key.startsWith('***')) newKeys.steadfast_api_key = b.steadfast_api_key.trim();
  if (b.steadfast_secret_key && !b.steadfast_secret_key.startsWith('***')) newKeys.steadfast_secret_key = b.steadfast_secret_key.trim();
  if (b.pathao_client_id && !b.pathao_client_id.startsWith('***')) newKeys.pathao_client_id = b.pathao_client_id.trim();
  if (b.pathao_client_secret && !b.pathao_client_secret.startsWith('***')) newKeys.pathao_client_secret = b.pathao_client_secret.trim();
  if (b.redx_api_token && !b.redx_api_token.startsWith('***')) newKeys.redx_api_token = b.redx_api_token.trim();
  if (b.redx_store_id !== undefined) newKeys.redx_store_id = String(b.redx_store_id || '').trim();
  if (b.paperfly_api_key && !b.paperfly_api_key.startsWith('***')) newKeys.paperfly_api_key = b.paperfly_api_key.trim();
  if (b.paperfly_username !== undefined) newKeys.paperfly_username = String(b.paperfly_username || '').trim();
  if (b.paperfly_password && !b.paperfly_password.startsWith('•••')) newKeys.paperfly_password = b.paperfly_password.trim();

  const pickup_hub = {
    address: String(b.address || existingMeta.pickup_hub?.address || '').trim(),
    district: String(b.district || vend.district || '').trim(),
    area: String(b.area || vend.area || '').trim(),
    phone: String(b.phone || vend.phone || '').trim()
  };

  const updatedMeta = {
    ...existingMeta,
    pickup_hub,
    courier_keys: newKeys,
    preferred_courier: b.preferred_courier || existingMeta.preferred_courier || 'steadfast'
  };

  // Safe storage in description + district + area + phone
  const baseDesc = (vend.description || '').split('__COURIER_CONFIG__:')[0].trim();
  const newDesc = `${baseDesc}\n\n__COURIER_CONFIG__:${JSON.stringify(updatedMeta)}`;
  const { error: e2 } = await admin
    .from('vendors')
    .update({
      district: pickup_hub.district || vend.district,
      area: pickup_hub.area || vend.area,
      phone: pickup_hub.phone || vend.phone,
      description: newDesc
    })
    .eq('id', vend.id);

  if (e2) throw error(500, e2.message);

  return json({
    ok: true,
    message: 'কুরিয়ার সেটিংস ও পিকআপ হাব সফলভাবে সংরক্ষিত হয়েছে।'
  });
};
