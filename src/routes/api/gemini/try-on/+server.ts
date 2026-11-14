import { json } from '@sveltejs/kit';
import * as gemini from '$lib/server/gemini.server';
import { tryOnModelsLab, modelslabConfigured, clothTypeFor, NoCreditsError } from '$lib/server/modelslab.server';
import { tryOnGarmentFree } from '$lib/server/freeImageEngine.server';

export const config = { maxDuration: 60 };

export const POST = async ({ request }) => {
  const { userImg, productImg, category, productName, productDescription, colorHint } = await request.json();

  if (!userImg || !productImg) {
    return json({
      error: 'input',
      message: 'অনুগ্রহ করে আপনার ছবি এবং একটি পোশাক নির্বাচন করুন।'
    });
  }

  // 1) Free Neural Engine (FLUX.1 Kontext Dev — 100% Free, Zero Quota Limits, Heritage & Modern Garment Aware)
  try {
    const freeOut = await tryOnGarmentFree({
      userImg,
      productImg,
      category,
      productName,
      productDescription,
      colorHint
    });
    if (freeOut) {
      return json({ image: freeOut, engine: 'flux-kontext-free' });
    }
  } catch (e: any) {
    console.warn('[try-on] Free Kontext engine failed, trying secondary lanes:', e?.message);
  }

  // 2) ModelsLab dedicated garment engine (SECONDARY — if configured with wallet credit)
  if (modelslabConfigured()) {
    try {
      const out = await tryOnModelsLab({
        personImage: userImg,
        garmentImage: productImg,
        clothType: clothTypeFor(category)
      });
      if (out) return json({ image: out, engine: 'modelslab' });
    } catch (e: any) {
      if (!(e instanceof NoCreditsError)) console.error('[try-on] ModelsLab failed:', e?.message);
    }
  }

  // 3) Gemini image try-on (TERTIARY fallback)
  try {
    const data = await gemini.generateTryOnTransformation(userImg, productImg);
    if (data) return json({ image: `data:image/png;base64,${data}`, engine: 'gemini' });
  } catch (e: any) {
    console.warn('[try-on] Gemini fallback failed:', e?.message);
  }

  return json({
    error: 'busy',
    message:
      'Aura ছবিটা পরিষ্কারভাবে প্রসেস করতে পারেনি — অনুগ্রহ করে একটু পর আবার চেষ্টা করুন বা স্পষ্ট একটি ছবি দিন।'
  });
};
