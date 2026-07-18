// Facebook Login for vendors — connect a page (no separate password) + pull its products.
// The heavy lifting (image → product) reuses the importer-v2 Gemini-vision extractor.
import { env } from '$env/dynamic/private';
import { extractProductsFromMedia, type SocialItem } from '$lib/server/socialImport.server';

const GRAPH = 'https://graph.facebook.com/v21.0';
export const FB_REDIRECT = 'https://www.snehalata.com/api/vendor/fb/callback';
// pages_show_list + pages_read_engagement = list the seller's pages and read their posts/photos.
const SCOPE = 'public_profile,pages_show_list,pages_read_engagement';

export function fbConfigured(): boolean {
  return Boolean(env.FB_APP_ID && env.FB_APP_SECRET);
}

export function oauthUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: env.FB_APP_ID || '',
    redirect_uri: FB_REDIRECT,
    scope: SCOPE,
    response_type: 'code',
    state
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${p.toString()}`;
}

async function gget(path: string): Promise<any> {
  try {
    const r = await fetch(`${GRAPH}${path}`);
    return await r.json();
  } catch (e: any) {
    return { error: { message: String(e?.message || e) } };
  }
}

// code → short-lived user token → long-lived user token (so the connection lasts ~60 days).
export async function exchangeCode(code: string): Promise<string | null> {
  const p = new URLSearchParams({
    client_id: env.FB_APP_ID || '',
    client_secret: env.FB_APP_SECRET || '',
    redirect_uri: FB_REDIRECT,
    code
  });
  const short = await gget(`/oauth/access_token?${p.toString()}`);
  if (!short?.access_token) return null;
  const lp = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: env.FB_APP_ID || '',
    client_secret: env.FB_APP_SECRET || '',
    fb_exchange_token: short.access_token
  });
  const long = await gget(`/oauth/access_token?${lp.toString()}`);
  return long?.access_token || short.access_token;
}

export type FbPage = { id: string; name: string; access_token: string };

export async function getIdentityAndPages(
  userToken: string
): Promise<{ fbUserId: string; name: string; pages: FbPage[] } | null> {
  const me = await gget(`/me?fields=id,name&access_token=${encodeURIComponent(userToken)}`);
  if (!me?.id) return null;
  const acc = await gget(`/me/accounts?fields=id,name,access_token&limit=50&access_token=${encodeURIComponent(userToken)}`);
  const pages: FbPage[] = (acc?.data || []).filter((p: any) => p?.id && p?.access_token);
  return { fbUserId: me.id, name: me.name || 'Facebook Store', pages };
}

// A connected page's posts + photos → {image, caption} → Gemini vision → real products.
export async function fetchPageProducts(pageId: string, pageToken: string): Promise<SocialItem[]> {
  const media: { imageUrl: string; caption: string }[] = [];
  const seen = new Set<string>();
  const add = (img: string, cap: string) => {
    // skip n8n template-leak captions ("{{ $json.message }}") and duplicate images
    if (img && !seen.has(img) && !/\{\{/.test(cap || '')) {
      seen.add(img);
      media.push({ imageUrl: img, caption: cap || '' });
    }
  };
  const tok = encodeURIComponent(pageToken);
  const posts = await gget(`/${pageId}/published_posts?fields=message,full_picture&limit=25&access_token=${tok}`);
  for (const p of posts?.data || []) if (p?.full_picture) add(p.full_picture, p.message || '');
  if (media.length < 6) {
    const photos = await gget(`/${pageId}/photos?type=uploaded&fields=name,images&limit=25&access_token=${tok}`);
    for (const ph of photos?.data || []) {
      const img = ph?.images?.[0]?.source;
      if (img) add(img, ph.name || '');
    }
  }
  return extractProductsFromMedia(media.slice(0, 15));
}
