import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { readSiteConfig, writeSiteConfig, DEFAULT_COMMISSION_CFG, normalizeCommission } from '$lib/server/siteConfig.server';
import type { RequestHandler } from './$types';

// Public GET = the live site config (categories + featured) the home reads.
// Admin POST (x-admin-pass) = the Aura Control Center writes it. Reads run server-side
// with the service_role key, so no secret is exposed to the browser.

export const GET: RequestHandler = async () => {
  const cfg = await readSiteConfig();
  return json({
    ok: true,
    categories: cfg.categories ?? null,
    featured: cfg.featured ?? null,
    commission: cfg.commission ? normalizeCommission(cfg.commission) : DEFAULT_COMMISSION_CFG
  });
};

export const POST: RequestHandler = async ({ request }) => {
  const pass = request.headers.get('x-admin-pass') ?? '';
  if (!env.ADMIN_PASSWORD || pass !== env.ADMIN_PASSWORD) throw error(401, 'Unauthorized — admin access denied');
  const body = await request.json();
  // Preserve unspecified keys so a partial save (e.g. just commission) doesn't wipe the rest.
  const current = await readSiteConfig();
  await writeSiteConfig({
    categories: body.categories ?? current.categories,
    featured: body.featured ?? current.featured,
    commission: body.commission ? normalizeCommission(body.commission) : current.commission
  });
  return json({ ok: true });
};
