// IndexNow — push new/updated URLs to Bing + Yandex instantly (free; the key is public by design,
// no console login needed). Bing powers ChatGPT/Copilot web search, so this is the fastest lever
// to get snehalata into AI search. Best-effort — never throws (an SEO push must not break a
// cron run or an admin action).
export const INDEXNOW_KEY = 'c4ad58f19e3113a89445c7779257097d';
const HOST = 'www.snehalata.com';

export async function pingIndexNow(
  urls: string[]
): Promise<{ ok: boolean; submitted: number; status?: number; error?: string }> {
  const urlList = Array.from(new Set((urls || []).filter(Boolean))).slice(0, 10000);
  if (!urlList.length) return { ok: false, submitted: 0, error: 'no urls' };
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
        urlList
      })
    });
    // IndexNow returns 200 or 202 on success.
    return { ok: res.ok, submitted: urlList.length, status: res.status };
  } catch (e: any) {
    return { ok: false, submitted: 0, error: e?.message || 'indexnow failed' };
  }
}
