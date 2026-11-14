import { json } from '@sveltejs/kit';
import * as gemini from '$lib/server/gemini.server';
import { applyMakeupFree } from '$lib/server/freeImageEngine.server';

export const config = { maxDuration: 60 };

export const POST = async ({ request }: { request: Request }) => {
  const { selfie, shade, kind } = await request.json();
  if (!selfie || !shade) {
    return json({ error: 'input', message: 'সেলফি ও একটি শেড — দুটোই দরকার।' });
  }

  // 1) Free Neural Engine (FLUX.1 Kontext Dev — 100% Free, Zero Quota Limits)
  try {
    const freeOut = await applyMakeupFree(selfie, String(shade), String(kind || 'lipstick'));
    if (freeOut) return json({ image: freeOut, engine: 'flux-kontext-free' });
  } catch (e: any) {
    console.warn('[makeup] Free Kontext engine failed, trying Gemini fallback:', e?.message);
  }

  // 2) Gemini fallback
  try {
    const data = await gemini.generateMakeupTryOn(selfie, String(shade), String(kind || 'lipstick'));
    if (data) return json({ image: `data:image/png;base64,${data}`, engine: 'gemini' });
  } catch (e: any) {
    console.warn('[makeup] Gemini fallback failed:', e?.message);
  }

  return json({
    error: 'busy',
    message: 'Aura সেলফিটা পরিষ্কারভাবে পড়তে পারেনি — মুখ স্পষ্ট দেখা যায় এমন একটা সেলফি দিন।'
  });
};
