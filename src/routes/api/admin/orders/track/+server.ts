import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { trackParcel } from '$lib/server/auraCourierBridge.server';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 30 };

function assertAdmin(request: Request) {
  const pass = request.headers.get('x-admin-pass') ?? '';
  if (!env.ADMIN_PASSWORD || pass !== env.ADMIN_PASSWORD) throw error(401, 'Unauthorized');
}

/**
 * GET /api/admin/orders/track?code=XYZ
 * Queries real-time courier milestones across Steadfast, Pathao, RedX, Paperfly.
 */
export const GET: RequestHandler = async ({ request, url }) => {
  assertAdmin(request);
  const code = url.searchParams.get('code');
  if (!code) throw error(400, 'Tracking code or consignment ID required');

  try {
    const tracking = await trackParcel(code);
    return json({ ok: true, tracking });
  } catch (err: any) {
    throw error(502, err?.message || 'Tracking lookup failed');
  }
};
