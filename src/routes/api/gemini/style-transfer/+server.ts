import { json } from '@sveltejs/kit';
import * as gemini from '$lib/server/gemini.server';
import { applyStyleTransferFree } from '$lib/server/freeImageEngine.server';

export const config = { maxDuration: 60 };

export const POST = async ({ request }) => {
  try {
    const { image, style } = await request.json();
    if (!image || !style) {
      return json({ error: 'input', message: 'অনুগ্রহ করে একটি ছবি এবং স্টাইল নির্বাচন করুন।' });
    }

    // 1) Free Neural Engine (FLUX.1 Kontext Dev — 100% Free, Zero Quota Limits)
    try {
      const freeOut = await applyStyleTransferFree(image, String(style));
      if (freeOut) return json({ image: freeOut, engine: 'flux-kontext-free' });
    } catch (e: any) {
      console.warn('[style-transfer] Free Kontext engine failed, trying Gemini fallback:', e?.message);
    }

    // 2) Gemini fallback
    const data = await gemini.generateStyleTransfer(image, style);
    if (data) return json({ image: `data:image/png;base64,${data}`, engine: 'gemini' });

    return json({ error: 'busy', message: 'Aura ছবিটি প্রসেস করতে পারেনি — অনুগ্রহ করে একটু পর আবার চেষ্টা করুন।' });
  } catch {
    return json({ error: 'busy', message: 'Aura Vision এখন ব্যস্ত — অনুগ্রহ করে কয়েক সেকেন্ড পর আবার চেষ্টা করুন।' });
  }
};
