import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { buildSiteUrls } from '$lib/server/siteUrls';
import { pingIndexNow } from '$lib/server/indexnow.server';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 30 };

// Admin "Submit to Bing / IndexNow" — pushes the full public URL set on demand (e.g. right
// after adding products) instead of waiting for the daily cron.
export const POST: RequestHandler = async ({ request }) => {
  const pass = request.headers.get('x-admin-pass') ?? '';
  if (!env.ADMIN_PASSWORD || pass !== env.ADMIN_PASSWORD) throw error(401, 'Unauthorized — admin only');
  const urls = (await buildSiteUrls()).map((u) => u.loc);
  const r = await pingIndexNow(urls);
  return json({ ...r, urls: urls.length });
};
