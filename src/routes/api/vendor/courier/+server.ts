import { json, error } from '@sveltejs/kit';
import { adminClient } from '$lib/server/vendorSync';
import type { RequestHandler } from './$types';

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
 * GET /api/vendor/courier
 * Returns vendor's configured pickup hub and courier status (keys are masked).
 */
export const GET: RequestHandler = async ({ request }) => {
  const { vend } = await vendorFromToken(request);
  const meta = vend.metadata || {};
  const hub = meta.pickup_hub || {
    address: '',
    district: '',
    area: '',
    phone: ''
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
      paperfly: Boolean(keys.paperfly_api_key)
    },
    // Masked hints for UI
    key_hints: {
      steadfast_api_key: keys.steadfast_api_key ? `***${keys.steadfast_api_key.slice(-4)}` : '',
      pathao_client_id: keys.pathao_client_id ? `***${keys.pathao_client_id.slice(-4)}` : '',
      redx_api_token: keys.redx_api_token ? `***${keys.redx_api_token.slice(-4)}` : '',
      paperfly_api_key: keys.paperfly_api_key ? `***${keys.paperfly_api_key.slice(-4)}` : ''
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

  const existingMeta = vend.metadata || {};
  const existingKeys = existingMeta.courier_keys || {};

  // Preserve existing keys if user leaves them blank or masked
  const newKeys = { ...existingKeys };
  if (b.steadfast_api_key && !b.steadfast_api_key.startsWith('***')) newKeys.steadfast_api_key = b.steadfast_api_key.trim();
  if (b.steadfast_secret_key && !b.steadfast_secret_key.startsWith('***')) newKeys.steadfast_secret_key = b.steadfast_secret_key.trim();
  if (b.pathao_client_id && !b.pathao_client_id.startsWith('***')) newKeys.pathao_client_id = b.pathao_client_id.trim();
  if (b.pathao_client_secret && !b.pathao_client_secret.startsWith('***')) newKeys.pathao_client_secret = b.pathao_client_secret.trim();
  if (b.redx_api_token && !b.redx_api_token.startsWith('***')) newKeys.redx_api_token = b.redx_api_token.trim();
  if (b.paperfly_api_key && !b.paperfly_api_key.startsWith('***')) newKeys.paperfly_api_key = b.paperfly_api_key.trim();

  const pickup_hub = {
    address: String(b.address || existingMeta.pickup_hub?.address || '').trim(),
    district: String(b.district || existingMeta.pickup_hub?.district || '').trim(),
    area: String(b.area || existingMeta.pickup_hub?.area || '').trim(),
    phone: String(b.phone || existingMeta.pickup_hub?.phone || '').trim()
  };

  const updatedMeta = {
    ...existingMeta,
    pickup_hub,
    courier_keys: newKeys,
    preferred_courier: b.preferred_courier || existingMeta.preferred_courier || 'steadfast'
  };

  const { error: e } = await admin.from('vendors').update({ metadata: updatedMeta }).eq('id', vend.id);
  if (e) throw error(500, e.message);

  return json({
    ok: true,
    message: 'কুরিয়ার সেটিংস ও পিকআপ হাব সফলভাবে সংরক্ষিত হয়েছে।'
  });
};
