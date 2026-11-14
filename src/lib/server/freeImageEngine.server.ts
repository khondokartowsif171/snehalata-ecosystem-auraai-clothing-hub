// Free Neural Image Engine for Snehalata Aura Studio
// Powered by Official Zero-Cost Gradio Spaces:
// 1. FLUX.1 Kontext Dev (black-forest-labs-flux-1-kontext-dev.hf.space) — In-Context Virtual Try-On, Makeup, Style Transfer & Image Remix
// 2. Florence-2 Vision Analyzer (prithivmlmods-florence-2-image-caption.hf.space) — Real-time Visual Garment Inspection (Pattern, Border, Cut & Color)
// 3. FLUX.1 Schnell (black-forest-labs-flux-1-schnell.hf.space) — Ultra-Fast 3s Text-to-Image Generation
// 4. FLUX.1 Merged HD (multimodalart-flux-1-merged.hf.space) — 8-Step Studio HD Text-to-Image Generation

const SITE_ORIGIN = 'https://www.snehalata.com';

const KONTEXT_SPACE = 'https://black-forest-labs-flux-1-kontext-dev.hf.space';
const FLORENCE_SPACE = 'https://prithivmlmods-florence-2-image-caption.hf.space';
const SCHNELL_SPACE = 'https://black-forest-labs-flux-1-schnell.hf.space';
const MERGED_SPACE = 'https://multimodalart-flux-1-merged.hf.space';

// Banglish & Heritage Fashion Glossary for automatic prompt enrichment
const BANGLISH_GLOSSARY: Record<string, string> = {
  jamdani: 'handwoven Bangladeshi Dhakai Jamdani silk with intricate geometric floral motifs',
  shari: 'traditional Bangladeshi draped saree',
  saree: 'traditional Bangladeshi draped saree with ornate pallu and border',
  panjabi: 'tailored Bangladeshi luxury men Panjabi tunic kurta with embroidered collar placket',
  borka: 'elegant modest full-length luxury Abaya Borka gown with flowing drape',
  abaya: 'elegant modest full-length luxury Abaya gown with flowing drape',
  'three-piece': 'traditional Bangladeshi three-piece salwar kameez ensemble with matching dupatta scarf',
  threepiece: 'traditional Bangladeshi three-piece salwar kameez ensemble with matching dupatta scarf',
  kameez: 'Bangladeshi embroidered salwar kameez suit with flowing dupatta',
  katan: 'royal Banarasi Katan silk saree with rich gold zari brocade',
  muslin: 'fine heritage Bangladeshi Dhakai Muslin fabric with delicate weave',
  nakshi: 'traditional Bengali Nakshi Kantha embroidered pattern',
  boishakh: 'festive Pohela Boishakh red and white traditional Bengali celebration style',
  holud: 'vibrant Bangladeshi Gaye Holud wedding ceremony marigold and yellow festive aesthetic'
};

/**
 * Translate Bengali or non-ASCII text to English using Google's free GTX endpoint,
 * and enrich Banglish fashion keywords for optimal FLUX.1 prompt adherence.
 */
export async function translateAndEnhancePrompt(rawPrompt: string): Promise<string> {
  let prompt = (rawPrompt || '').trim();
  if (!prompt) return 'Luxury Bangladeshi heritage fashion portrait, studio lighting, 8k resolution';

  if (/[^\x00-\x7F]/.test(prompt)) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(prompt)}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (resp.ok) {
        const data = await resp.json();
        const translated = Array.isArray(data?.[0])
          ? data[0].map((seg: any) => seg?.[0] || '').join('').trim()
          : '';
        if (translated) prompt = translated;
      }
    } catch {
      // Fall through with original prompt if translation times out
    }
  }

  let enriched = prompt;
  for (const [term, expansion] of Object.entries(BANGLISH_GLOSSARY)) {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(prompt) && !prompt.toLowerCase().includes(expansion.slice(0, 18).toLowerCase())) {
      enriched += `, featuring ${expansion}`;
    }
  }

  return enriched;
}

/**
 * Resolve any image reference (data: URL, https:// URL, or site-relative /path)
 * into a binary Buffer + MIME type.
 */
export async function resolveImageBuffer(ref: string): Promise<{ buffer: Buffer; mimeType: string; ext: string }> {
  if (!ref) throw new Error('Empty image reference');

  const dataMatch = ref.match(/^data:(image\/[\w+.-]+);base64,(.+)$/s);
  if (dataMatch) {
    const mimeType = dataMatch[1];
    const ext = (mimeType.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
    return {
      buffer: Buffer.from(dataMatch[2], 'base64'),
      mimeType,
      ext
    };
  }

  const url = /^https?:\/\//i.test(ref)
    ? ref
    : SITE_ORIGIN + (ref.startsWith('/') ? ref : '/' + ref);

  const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!resp.ok) throw new Error(`Failed to fetch image (${resp.status}): ${url}`);
  const ct = (resp.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  const mimeType = ct.startsWith('image/') ? ct : 'image/jpeg';
  const ext = (mimeType.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
  const buffer = Buffer.from(await resp.arrayBuffer());
  return { buffer, mimeType, ext };
}

/**
 * Map an RGB triplet to a descriptive fashion color name + hex string.
 */
function rgbToFashionColor(r: number, g: number, b: number): string {
  const hex = '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;
  const d = max - min;
  const s = d === 0 ? 0 : d / (255 - Math.abs(2 * max - 255 - d));

  if (l < 0.14) return `Jet Black (${hex})`;
  if (l > 0.88 && s < 0.18) return `Ivory / Off-White (${hex})`;
  if (s < 0.14) return l < 0.45 ? `Charcoal Grey (${hex})` : `Silver Grey (${hex})`;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }

  if (h < 15 || h >= 345) return l < 0.38 ? `Deep Crimson Maroon (${hex})` : `Royal Ruby Red (${hex})`;
  if (h < 35) return l < 0.42 ? `Rust Terracotta (${hex})` : `Coral Orange (${hex})`;
  if (h < 62) return l < 0.45 ? `Antique Bronze Gold (${hex})` : `Golden Mustard Yellow (${hex})`;
  if (h < 165) return l < 0.38 ? `Deep Emerald Forest Green (${hex})` : `Olive / Mint Green (${hex})`;
  if (h < 205) return `Teal Turquoise (${hex})`;
  if (h < 255) return l < 0.35 ? `Royal Navy Blue (${hex})` : `Sapphire Sky Blue (${hex})`;
  if (h < 295) return l < 0.38 ? `Deep Imperial Plum Purple (${hex})` : `Lavender Violet (${hex})`;
  return l < 0.42 ? `Berry Wine Magenta (${hex})` : `Rose Blush Pink (${hex})`;
}

/**
 * Extract dominant garment color description from a product image buffer.
 */
export async function extractGarmentColorProfile(imageRef: string, clientColorHint?: string): Promise<string> {
  if (clientColorHint && clientColorHint.trim().length > 2) return clientColorHint.trim();
  try {
    const { buffer } = await resolveImageBuffer(imageRef);
    const sharpMod = await import('sharp').catch(() => null);
    if (!sharpMod?.default) return '';

    const sharp = sharpMod.default;
    const meta = await sharp(buffer).metadata();
    const w = meta.width || 200;
    const h = meta.height || 200;

    const left = Math.round(w * 0.275);
    const top = Math.round(h * 0.25);
    const cw = Math.max(16, Math.round(w * 0.45));
    const ch = Math.max(16, Math.round(h * 0.5));

    const { data, info } = await sharp(buffer)
      .extract({ left, top, width: cw, height: ch })
      .resize(24, 24, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    const step = info.channels;
    for (let i = 0; i < data.length; i += step) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r > 240 && g > 240 && b > 240) continue;
      rSum += r;
      gSum += g;
      bSum += b;
      count++;
    }
    if (count === 0) return '';
    return rgbToFashionColor(rSum / count, gSum / count, bSum / count);
  } catch {
    return '';
  }
}

/**
 * Inspect the actual product image visually using Florence-2 Vision (with strict timeout cap so it never blocks).
 */
export async function describeGarmentImageVisually(productImgRef: string): Promise<string> {
  try {
    const { buffer, mimeType, ext } = await resolveImageBuffer(productImgRef);
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    const form = new FormData();
    form.append('files', blob, `garment.${ext}`);

    const upResp = await fetch(`${FLORENCE_SPACE}/gradio_api/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(3500)
    });
    if (!upResp.ok) return '';
    const upPaths = await upResp.json();
    const uploadedPath = Array.isArray(upPaths) ? upPaths[0] : null;
    if (!uploadedPath) return '';

    const callResp = await fetch(`${FLORENCE_SPACE}/gradio_api/call/describe_image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{ path: uploadedPath, meta: { _type: 'gradio.FileData' } }, 'Florence-2-large']
      }),
      signal: AbortSignal.timeout(5000)
    });
    if (!callResp.ok) return '';
    const { event_id } = await callResp.json();
    if (!event_id) return '';

    const sseResp = await fetch(`${FLORENCE_SPACE}/gradio_api/call/describe_image/${event_id}`, {
      signal: AbortSignal.timeout(11000)
    });
    if (!sseResp.ok) return '';
    const text = await sseResp.text();
    const m = text.match(/event:\s*complete\s*\ndata:\s*(\[[\s\S]*?\])\n/);
    if (!m) return '';
    const parsed = JSON.parse(m[1]);
    const rawCaption = typeof parsed?.[0] === 'string' ? parsed[0].trim() : '';
    // Keep only sentences describing the clothing/garment/color/embroidery, drop pose/background sentences
    return rawCaption
      .split(/\.\s+/)
      .filter((s) => !/background is|standing|sitting|looking|expression|hair is|hands on/i.test(s))
      .join('. ')
      .trim();
  } catch {
    return '';
  }
}

/**
 * Parse Gradio SSE stream to extract the completed file output URL and convert it to a base64 Data URL.
 */
async function readGradioSseAndFetchDataUrl(baseSpaceUrl: string, sseResp: Response): Promise<string | null> {
  const text = await sseResp.text();
  const lines = text.split('\n');
  let completeDataLine: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === 'event: complete' && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (nextLine.startsWith('data:')) {
        completeDataLine = nextLine.slice(5).trim();
        break;
      }
    }
  }

  if (!completeDataLine) {
    const match = text.match(/event:\s*complete\s*\ndata:\s*(\[[\s\S]*?\])\n/);
    if (match) completeDataLine = match[1];
  }

  if (!completeDataLine) return null;

  const parsed = JSON.parse(completeDataLine);
  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  const fileObj = first?.image || first;
  let fileUrl: string | null = fileObj?.url || null;
  if (!fileUrl && fileObj?.path) {
    fileUrl = `${baseSpaceUrl}/gradio_api/file=${fileObj.path}`;
  }
  if (!fileUrl) return null;

  const imgResp = await fetch(fileUrl, { signal: AbortSignal.timeout(15000) });
  if (!imgResp.ok) return fileUrl;
  const mime = (imgResp.headers.get('content-type') || 'image/webp').split(';')[0].trim();
  const buf = Buffer.from(await imgResp.arrayBuffer());
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/**
 * Upload an image buffer to FLUX.1 Kontext Dev and run in-context editing.
 * Returns a self-contained data:image/webp;base64,... URL.
 */
export async function editImageWithFluxKontext(
  imageRef: string,
  editPrompt: string,
  opts: { guidanceScale?: number; steps?: number; preUploadedPath?: string } = {}
): Promise<string | null> {
  let uploadedPath = opts.preUploadedPath || null;

  if (!uploadedPath) {
    const { buffer, mimeType, ext } = await resolveImageBuffer(imageRef);
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    const form = new FormData();
    form.append('files', blob, `input.${ext}`);

    const upResp = await fetch(`${KONTEXT_SPACE}/gradio_api/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(15000)
    });
    if (!upResp.ok) throw new Error(`Kontext upload failed (${upResp.status})`);
    const upPaths = await upResp.json();
    uploadedPath = Array.isArray(upPaths) ? upPaths[0] : null;
  }

  if (!uploadedPath) throw new Error('Kontext upload returned empty path');

  const callResp = await fetch(`${KONTEXT_SPACE}/gradio_api/call/infer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [
        { path: uploadedPath, meta: { _type: 'gradio.FileData' } },
        editPrompt,
        0,
        true,
        opts.guidanceScale ?? 2.5,
        opts.steps ?? 24
      ]
    }),
    signal: AbortSignal.timeout(15000)
  });
  if (!callResp.ok) throw new Error(`Kontext infer call failed (${callResp.status})`);
  const { event_id } = await callResp.json();
  if (!event_id) throw new Error('Kontext returned no event_id');

  const sseResp = await fetch(`${KONTEXT_SPACE}/gradio_api/call/infer/${event_id}`, {
    signal: AbortSignal.timeout(48000)
  });
  if (!sseResp.ok) throw new Error(`Kontext SSE stream failed (${sseResp.status})`);

  return await readGradioSseAndFetchDataUrl(KONTEXT_SPACE, sseResp);
}

/**
 * Virtual Garment Try-On powered by FLUX.1 Kontext Dev + Concurrent Visual & Color Garment Profiling.
 */
export async function tryOnGarmentFree(opts: {
  userImg: string;
  productImg: string;
  category?: string;
  productName?: string;
  productDescription?: string;
  colorHint?: string;
}): Promise<string | null> {
  // Run User Image Upload to Kontext + Product Visual Analysis + Color Profiling concurrently!
  const uploadUserPromise = (async () => {
    const { buffer, mimeType, ext } = await resolveImageBuffer(opts.userImg);
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    const form = new FormData();
    form.append('files', blob, `user.${ext}`);
    const upResp = await fetch(`${KONTEXT_SPACE}/gradio_api/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(15000)
    });
    if (!upResp.ok) throw new Error(`Kontext upload failed (${upResp.status})`);
    const upPaths = await upResp.json();
    return Array.isArray(upPaths) ? upPaths[0] : null;
  })();

  const [uploadedUserPath, colorProfile, visionCaption, cleanName, cleanDesc] = await Promise.all([
    uploadUserPromise,
    extractGarmentColorProfile(opts.productImg, opts.colorHint),
    describeGarmentImageVisually(opts.productImg),
    translateAndEnhancePrompt((opts.productName || opts.category || 'Traditional Garment').trim()),
    opts.productDescription ? translateAndEnhancePrompt(opts.productDescription.slice(0, 160)) : Promise.resolve('')
  ]);

  const cat = (opts.category || 'Traditional Garment').trim();
  const catLower = cat.toLowerCase();
  let garmentSpec = `${cleanName} (${cat})`;
  if (colorProfile) garmentSpec += ` in exact color palette: ${colorProfile}`;
  if (visionCaption) garmentSpec += ` (visual garment details: ${visionCaption})`;
  if (cleanDesc) garmentSpec += ` — ${cleanDesc}`;

  let drapeInstructions = 'naturally fitted with realistic fabric folds, texture, collar/sleeve details, and accurate studio lighting';
  if (/saree|shari/i.test(catLower)) {
    drapeInstructions = 'draped authentically in traditional Bangladeshi Nivi saree style with pleated front, matching blouse, and ornate pallu over the shoulder, showing intricate weave, motifs, and border details';
  } else if (/panjabi/i.test(catLower)) {
    drapeInstructions = 'tailored as a luxury Bangladeshi men Panjabi tunic kurta with intricate collar and placket embroidery, realistic silk/cotton fabric drape and crisp folds';
  } else if (/borka|abaya/i.test(catLower)) {
    drapeInstructions = 'styled as a modest, flowing full-length luxury Abaya Borka gown with elegant sleeve and front embroidery details';
  } else if (/three-?piece|kameez/i.test(catLower)) {
    drapeInstructions = 'styled as a Bangladeshi embroidered three-piece salwar kameez suit with matching draped dupatta scarf';
  }

  const prompt = `Photorealistic virtual fashion try-on: Dress the person in this image in ${garmentSpec}, ${drapeInstructions}. Keep the person's exact face, facial expression, hairstyle, skin tone, body proportions, hands, pose, and background 100% identical and unchanged. Only replace their current clothing with the new garment seamlessly.`;

  return await editImageWithFluxKontext(opts.userImg, prompt, {
    guidanceScale: 2.8,
    steps: 24,
    preUploadedPath: uploadedUserPath || undefined
  });
}

/**
 * Virtual Cosmetics & Makeup Try-On powered by FLUX.1 Kontext Dev.
 */
export async function applyMakeupFree(selfie: string, shade: string, kind = 'lipstick'): Promise<string | null> {
  const area =
    kind === 'blush'
      ? 'cheeks as soft natural blush'
      : kind === 'eyeshadow'
        ? 'upper eyelids as blended luxury eyeshadow'
        : 'lips as smooth satin lipstick';

  const prompt = `Photorealistic virtual makeup try-on: Apply ${shade} ${kind} to this person's ${area} with a realistic, natural cosmetic finish that matches their skin tone and lighting. Keep the person's exact face, identity, eyes, hair, clothing, pose, and background 100% identical and untouched — only change the color of the ${kind === 'blush' ? 'cheeks' : kind === 'eyeshadow' ? 'eyelids' : 'lips'}.`;

  return await editImageWithFluxKontext(selfie, prompt, { guidanceScale: 2.5, steps: 22 });
}

/**
 * Neural Artistic Style Transfer powered by FLUX.1 Kontext Dev.
 */
export async function applyStyleTransferFree(image: string, styleInstruction: string): Promise<string | null> {
  const cleanStyle = await translateAndEnhancePrompt(styleInstruction);
  const prompt = `Transform and re-style this image into the artistic aesthetic of: ${cleanStyle}. Preserve the person's facial identity, pose, and core subject composition while shifting the lighting, color grading, texture, and artistic medium to match ${cleanStyle}.`;

  return await editImageWithFluxKontext(image, prompt, { guidanceScale: 2.8, steps: 24 });
}

/**
 * Free Text-to-Image & Reference-to-Image Fashion Generator.
 * Supports:
 * - FLUX.1 Schnell (3s Turbo mode)
 * - FLUX.1 Merged HD (8-step Studio HD mode)
 * - FLUX.1 Kontext Dev (when referenceImage is provided)
 */
export async function generateFashionImageFree(opts: {
  prompt: string;
  referenceImage?: string;
  aspectRatio?: '1:1' | '3:4' | '16:9' | '9:16';
  quality?: 'turbo' | 'hd';
}): Promise<string | null> {
  const enhancedPrompt = await translateAndEnhancePrompt(opts.prompt);
  const fullPrompt = `${enhancedPrompt}. High-end fashion editorial photography, photorealistic textures, natural lighting, sharp focus, 8k resolution.`;

  if (opts.referenceImage && opts.referenceImage.trim().length > 5) {
    try {
      const edited = await editImageWithFluxKontext(opts.referenceImage, fullPrompt, {
        guidanceScale: 2.8,
        steps: 24
      });
      if (edited) return edited;
    } catch (e: any) {
      console.warn('[freeImageEngine] Kontext reference remix fallback to text2img:', e?.message);
    }
  }

  let width = 768;
  let height = 1024;
  if (opts.aspectRatio === '1:1') {
    width = 1024;
    height = 1024;
  } else if (opts.aspectRatio === '16:9') {
    width = 1024;
    height = 576;
  } else if (opts.aspectRatio === '9:16' || opts.aspectRatio === '3:4') {
    width = 768;
    height = 1024;
  }

  const runSchnell = async (): Promise<string | null> => {
    const callResp = await fetch(`${SCHNELL_SPACE}/gradio_api/call/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [fullPrompt, 0, true, width, height, 4]
      }),
      signal: AbortSignal.timeout(12000)
    });
    if (!callResp.ok) throw new Error(`Schnell call failed (${callResp.status})`);
    const { event_id } = await callResp.json();
    if (!event_id) throw new Error('Schnell returned no event_id');
    const sseResp = await fetch(`${SCHNELL_SPACE}/gradio_api/call/infer/${event_id}`, {
      signal: AbortSignal.timeout(30000)
    });
    if (!sseResp.ok) throw new Error(`Schnell SSE failed (${sseResp.status})`);
    return await readGradioSseAndFetchDataUrl(SCHNELL_SPACE, sseResp);
  };

  const runMergedHd = async (): Promise<string | null> => {
    const callResp = await fetch(`${MERGED_SPACE}/gradio_api/call/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [fullPrompt, 0, true, width, height, 3.5, 8]
      }),
      signal: AbortSignal.timeout(12000)
    });
    if (!callResp.ok) throw new Error(`Merged HD call failed (${callResp.status})`);
    const { event_id } = await callResp.json();
    if (!event_id) throw new Error('Merged HD returned no event_id');
    const sseResp = await fetch(`${MERGED_SPACE}/gradio_api/call/infer/${event_id}`, {
      signal: AbortSignal.timeout(35000)
    });
    if (!sseResp.ok) throw new Error(`Merged HD SSE failed (${sseResp.status})`);
    return await readGradioSseAndFetchDataUrl(MERGED_SPACE, sseResp);
  };

  const engines = opts.quality === 'hd' ? [runMergedHd, runSchnell] : [runSchnell, runMergedHd];
  for (const engine of engines) {
    try {
      const out = await engine();
      if (out) return out;
    } catch (e: any) {
      console.warn('[freeImageEngine] engine lane failed, trying next:', e?.message);
    }
  }
  return null;
}
