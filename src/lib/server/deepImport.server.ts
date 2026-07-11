// Headless-render deep import — launch @sparticuz/chromium + puppeteer-core, render a URL
// (with a lazy-load scroll), and heuristically pull product tiles (name + price + image)
// from the LIVE DOM. Shared by /api/vendor/deep-import and /api/admin/vendor-import.
// Heavy + slow → callers must set `config.maxDuration` + memory.
export async function renderAndExtract(
  targetUrl: string
): Promise<{ name: string; price: number; imageUrl: string }[]> {
  const chromium = (await import('@sparticuz/chromium')).default;
  const puppeteer = await import('puppeteer-core');

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 1800 },
    executablePath: await chromium.executablePath(),
    headless: true
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (compatible; AuraNeuralGrid/1.0; +https://www.snehalata.com)');
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
    // Trigger lazy-load: scroll the page in steps, then settle.
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let y = 0;
        const step = () => {
          window.scrollTo(0, y);
          y += 700;
          if (y < document.body.scrollHeight && y < 12000) setTimeout(step, 180);
          else resolve();
        };
        step();
      });
    });
    await new Promise((r) => setTimeout(r, 1500));

    const items = await page.evaluate(() => {
      const priceRe = /(?:৳|Tk\.?|BDT|Rs\.?|\$)\s?[\d,]{2,}|[\d,]{3,}\s?(?:৳|টাকা|tk)/i;
      const out: { name: string; price: number; imageUrl: string }[] = [];
      const seen = new Set<string>();
      const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
      for (const img of imgs) {
        const src = img.currentSrc || img.src || '';
        if (!src || src.startsWith('data:')) continue;
        if (/logo|icon|sprite|banner|favicon|placeholder|avatar/i.test(src)) continue;
        const w = img.naturalWidth || img.width || 0;
        if (w && w < 90) continue; // skip tiny UI images
        let el: HTMLElement | null = img;
        let container: HTMLElement | null = null;
        let priceText = '';
        for (let i = 0; i < 6 && el; i++) {
          el = el.parentElement;
          if (!el) break;
          const t = (el as HTMLElement).innerText || '';
          const m = t.match(priceRe);
          if (m) {
            container = el;
            priceText = m[0];
            break;
          }
        }
        if (!container) continue;
        const lines = ((container.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean)).filter(
          (s) => !priceRe.test(s)
        );
        const name = lines.filter((s) => s.length >= 3 && s.length <= 100).sort((a, b) => a.length - b.length)[0] || (img.alt || '').trim();
        if (!name) continue;
        const digits = (priceText.match(/[\d,]{2,}/) || [''])[0].replace(/,/g, '');
        const price = parseInt(digits) || 0;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ name: name.slice(0, 200), price, imageUrl: src });
        if (out.length >= 80) break;
      }
      return out;
    });
    return items;
  } finally {
    await browser.close().catch(() => {});
  }
}
