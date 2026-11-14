import { json } from '@sveltejs/kit';
import * as gemini from '$lib/server/gemini.server';
import { generateFashionImageFree } from '$lib/server/freeImageEngine.server';

export const config = { maxDuration: 60 };

export const POST = async ({ request }) => {
  try {
    const { prompt, referenceImage, aspectRatio, quality } = await request.json();
    if (!prompt || !String(prompt).trim()) {
      return json({ error: 'input', message: 'অনুগ্রহ করে ছবির একটি বিবরণ (Prompt) লিখুন।' }, { status: 400 });
    }

    // 1) Primary Free Neural Image Generator (FLUX.1 Schnell / FLUX.1 Merged HD / FLUX.1 Kontext Remix)
    try {
      const freeDataUrl = await generateFashionImageFree({
        prompt: String(prompt),
        referenceImage,
        aspectRatio: aspectRatio || '3:4',
        quality: quality || 'turbo'
      });
      if (freeDataUrl) {
        const base64Part = freeDataUrl.includes(',') ? freeDataUrl.split(',')[1] : freeDataUrl;
        return json({
          image: base64Part,
          imageUrl: freeDataUrl,
          engine: referenceImage ? 'flux-kontext-free' : quality === 'hd' ? 'flux-merged-hd' : 'flux-schnell-free'
        });
      }
    } catch (e: any) {
      console.warn('[generate-image] Free engine failed, trying Gemini fallback:', e?.message);
    }

    // 2) Gemini fallback
    const data = await gemini.generateAuraImage(prompt, referenceImage);
    if (data) {
      return json({
        image: data,
        imageUrl: `data:image/png;base64,${data}`,
        engine: 'gemini'
      });
    }

    return json({ error: 'busy', message: 'ইমেজ জেনারেট করা যায়নি — একটু পর আবার চেষ্টা করুন।' }, { status: 503 });
  } catch (error: any) {
    return json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
};
