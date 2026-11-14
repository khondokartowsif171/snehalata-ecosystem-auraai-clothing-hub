import { json } from '@sveltejs/kit';
import * as gemini from '$lib/server/gemini.server';
import { generateFashionImageFree } from '$lib/server/freeImageEngine.server';

export const config = { maxDuration: 60 };

export const POST = async ({ request }) => {
  try {
    const { prompt, size, aspectRatio, referenceImage } = await request.json();

    // 1) Free Neural HD Generator (FLUX.1 Merged 8-Step HD / FLUX.1 Schnell)
    try {
      const freeDataUrl = await generateFashionImageFree({
        prompt: String(prompt || ''),
        referenceImage,
        aspectRatio: aspectRatio || '1:1',
        quality: 'hd'
      });
      if (freeDataUrl) {
        const base64Part = freeDataUrl.includes(',') ? freeDataUrl.split(',')[1] : freeDataUrl;
        return json({
          image: base64Part,
          imageUrl: freeDataUrl,
          engine: 'flux-merged-hd'
        });
      }
    } catch (e: any) {
      console.warn('[pro-image] Free HD engine failed, trying Gemini fallback:', e?.message);
    }

    // 2) Gemini fallback
    const data = await gemini.generateAuraProImage(prompt, size);
    if (data) {
      return json({
        image: data,
        imageUrl: `data:image/png;base64,${data}`,
        engine: 'gemini'
      });
    }

    return json({ error: 'busy', message: 'HD ইমেজ জেনারেট করা যায়নি — একটু পর আবার চেষ্টা করুন।' }, { status: 503 });
  } catch (error: any) {
    return json({ error: error.message || 'Pro generation failed' }, { status: 500 });
  }
};
