// Free Neural Image Engine for Snehalata Aura Studio
// Powered by Official Zero-Cost Gradio Spaces + DeepSeek V3 Prompt Synthesis:
// 1. FLUX.1 Kontext Dev (black-forest-labs-flux-1-kontext-dev.hf.space) — In-Context Virtual Try-On, Makeup, Style Transfer & Image Remix
// 2. Florence-2 Large Vision Analyzer (prithivmlmods-florence-2-image-caption.hf.space) — Real-time Visual Garment Inspection (Pattern, Print, Collar, Cuffs & Cut)
// 3. Multi-Cluster Spatial Color & Pattern Histogram Analyzer — Prevents black+white->grey averaging and detects vertical stripes, floral prints, paisley, or solid weave
// 4. FLUX.1 Schnell & FLUX.1 Merged HD — 100% Free Text-to-Image Generation

const SITE_ORIGIN = 'https://www.snehalata.com';

const KONTEXT_SPACE = 'https://black-forest-labs-flux-1-kontext-dev.hf.space';
const FLORENCE_SPACE = 'https://prithivmlmods-florence-2-image-caption.hf.space';
const SCHNELL_SPACE = 'https://black-forest-labs-flux-1-schnell.hf.space';
const MERGED_SPACE = 'https://multimodalart-flux-1-merged.hf.space';
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || 'sk-bdd262d3ad024f7ea3af475a6b60005e';

// Exact Visual DNA signatures for showcase catalog items in /products/*
const CATALOG_VISUAL_DNA: Record<string, string> = {
  'shirt-1.jpg': 'solid deep burgundy maroon premium cotton formal button-down shirt with classic collar, dark maroon buttons, and small gold emblem on chest',
  'shirt-2.jpg': 'solid dark midnight navy blue textured cotton formal button-down shirt with classic collar and matching dark buttons',
  'shirt-3.jpg': 'solid olive sage green textured cotton formal button-down shirt with classic collar and dark buttons',
  'shirt-4.jpg': 'solid warm cream ivory beige textured cotton formal button-down shirt with classic collar and light buttons',
  'shirt-5.jpg': 'solid sky blue micro-textured cotton formal button-down shirt with white buttons and classic collar',
  'shirt-6.jpg': 'jet-black casual button-down shirt featuring bold vertical white geometric and tribal ornamental stripe bands running vertically down the entire front chest, shoulders, and sleeves, with rolled-up grey-and-white patterned cuffs',
  'shirt-7.jpg': 'ice-blue / light slate-blue casual button-down shirt featuring subtle white ornamental paisley and floral filigree motifs across the fabric and white rolled-up cuffs',
  'shirt-8.jpg': 'jet-black casual button-down shirt covered in large high-contrast crisp white hibiscus flower and leaf floral prints across the chest and sleeves, with solid white rolled-up cuffs',
  'shirt-9.jpg': 'jet-black casual button-down shirt covered in intricate golden-brown, bronze, and tan paisley ornamental prints all over the torso and sleeves, with crisp white rolled-up cuffs',
  'shirt-10.jpg': 'deep maroon wine casual button-down shirt with two embossed geometric textured chest pockets, black buttons, and rolled-up sleeves',
  'shirt-11.jpg': 'white, grey, and soft blush-pink tie-dye gradient casual button-down shirt with bold white stencil typography lettering print across the chest and dual flap chest pockets with white rolled cuffs',
  'shirt-12.jpg': 'dark maroon streetwear utility button-down shirt featuring bold black-and-white horizontal text tape across the chest, white graphic patch on right pocket, and white SIX patch on left pocket',
  'shirt-13.jpg': 'white casual button-down shirt with horizontal coral-pink and grey abstract tie-dye brush stroke bands across the shoulders, chest, and hem, dual chest flap pockets, and white rolled cuffs',
  'saree-1.jpg': 'midnight navy blue handwoven Jamdani silk saree with antique copper-gold zari geometric border, red-and-gold floral buti motifs on the pallu, and matching navy blue blouse',
  'saree-2.jpg': 'traditional Tangail handloom cotton saree with intricate woven heritage border and geometric motifs',
  'saree-3.jpg': 'royal sapphire blue pure silk Jamdani saree with shimmering silver-and-gold zari border and woven floral motifs across the pallu and pleats',
  'threepiece-1.jpg': 'deep wine-purple embroidered long kameez tunic with copper-gold neckline and hem embroidery, matching wine-purple straight trousers, and a wine-purple dupatta scarf with ornate gold border',
  'panjabi-1.jpg': 'tailored Bangladeshi luxury men Panjabi kurta tunic in deep navy blue with intricate tonal blue geometric embroidery along the mandarin collar and chest placket',
  'panjabi-2.jpg': 'tailored Bangladeshi luxury men Panjabi kurta tunic with intricate embroidered mandarin collar and chest placket'
};

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
 * Classify a single RGB pixel into a named fashion color bucket (never averaging black+white into grey).
 */
function classifyPixelBucket(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;
  const d = max - min;
  const s = d === 0 ? 0 : d / (255 - Math.abs(2 * max - 255 - d));

  if (l < 0.18) return 'Jet Black';
  if (l > 0.80 && s < 0.22) return 'Crisp White';
  if (s < 0.15) return l < 0.48 ? 'Charcoal Grey' : 'Light Silver Grey';

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }

  if (h < 16 || h >= 345) return l < 0.38 ? 'Deep Maroon Burgundy' : 'Crimson Red';
  if (h < 38) return l < 0.42 ? 'Rust Brown / Terracotta' : 'Coral Orange';
  if (h < 65) return l < 0.46 ? 'Antique Gold / Bronze' : 'Warm Mustard / Cream Gold';
  if (h < 165) return l < 0.38 ? 'Deep Emerald Forest Green' : 'Olive / Sage Green';
  if (h < 205) return 'Teal / Ice Blue';
  if (h < 255) return l < 0.36 ? 'Midnight Navy Blue' : 'Royal / Sky Blue';
  if (h < 295) return l < 0.38 ? 'Deep Wine Purple' : 'Lavender Violet';
  return l < 0.42 ? 'Berry Wine Magenta' : 'Soft Blush Pink';
}

/**
 * Multi-Cluster Spatial Color & Pattern Analyzer.
 * Finds the top distinct color buckets AND detects whether the fabric is solid, vertical-striped, or all-over printed.
 */
export async function analyzeGarmentVisualStructure(imageRef: string, clientColorHint?: string): Promise<string> {
  // Check if this is a known catalog image first
  const basename = (imageRef.split('/').pop() || '').split('?')[0].toLowerCase();
  if (CATALOG_VISUAL_DNA[basename]) {
    return CATALOG_VISUAL_DNA[basename];
  }

  if (clientColorHint && clientColorHint.length > 12 && !/^#[0-9a-f]{6}$/i.test(clientColorHint.trim())) {
    return clientColorHint.trim();
  }

  try {
    const { buffer } = await resolveImageBuffer(imageRef);
    const sharpMod = await import('sharp').catch(() => null);
    if (!sharpMod?.default) return '';

    const sharp = sharpMod.default;
    const { data, info } = await sharp(buffer)
      .resize(48, 48, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const step = info.channels;
    const W = info.width;
    const H = info.height;
    const counts: Record<string, number> = {};
    let totalSampled = 0;
    let horizGradSum = 0;
    let vertGradSum = 0;
    let gradCount = 0;

    // Sample the garment region (x: 20%..80%, y: 20%..80%), skipping center price-tag box (x: 42%..58%, y: 35%..55%)
    for (let y = Math.floor(H * 0.2); y < Math.floor(H * 0.8); y++) {
      for (let x = Math.floor(W * 0.2); x < Math.floor(W * 0.8); x++) {
        if (x > W * 0.42 && x < W * 0.58 && y > H * 0.35 && y < H * 0.55) continue;
        const idx = (y * W + x) * step;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        const bucket = classifyPixelBucket(r, g, b);
        counts[bucket] = (counts[bucket] || 0) + 1;
        totalSampled++;

        if (x + 1 < W && y + 1 < H) {
          const idxR = (y * W + (x + 1)) * step;
          const idxD = ((y + 1) * W + x) * step;
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const lumR = 0.299 * data[idxR] + 0.587 * data[idxR + 1] + 0.114 * data[idxR + 2];
          const lumD = 0.299 * data[idxD] + 0.587 * data[idxD + 1] + 0.114 * data[idxD + 2];
          horizGradSum += Math.abs(lum - lumR);
          vertGradSum += Math.abs(lum - lumD);
          gradCount++;
        }
      }
    }

    if (totalSampled === 0) return '';

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .filter(([, c]) => c / totalSampled >= 0.12)
      .slice(0, 3);

    const avgHoriz = gradCount ? horizGradSum / gradCount : 0;
    const avgVert = gradCount ? vertGradSum / gradCount : 0;
    const totalEdge = (avgHoriz + avgVert) / 2;

    let patternType = 'solid smooth fabric';
    if (totalEdge > 26 && avgHoriz > avgVert * 1.25) {
      patternType = 'high-contrast vertical striped and geometric ornamental band pattern';
    } else if (totalEdge > 24) {
      patternType = 'bold high-contrast all-over printed motif pattern';
    } else if (totalEdge > 12) {
      patternType = 'woven patterned / embroidered texture';
    }

    const colorSummary = sorted
      .map(([name, c]) => `${name} (${Math.round((c / totalSampled) * 100)}%)`)
      .join(' combined with ');

    return `${patternType} featuring ${colorSummary}`;
  } catch {
    return '';
  }
}

/**
 * Helper to extract data array JSON from a Gradio SSE response text reliably.
 */
function extractGradioCompleteJson(sseText: string): any {
  const lines = sseText.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'event: complete') {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const l = lines[j].trim();
        if (l.startsWith('data:')) {
          const raw = l.slice(5).trim();
          try {
            return JSON.parse(raw);
          } catch {
            // continue
          }
        }
      }
    }
  }
  const fallback = sseText.match(/event:\s*complete[\r\n]+data:\s*(\[[\s\S]*?\])(?:[\r\n]|$)/);
  if (fallback) {
    try {
      return JSON.parse(fallback[1]);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Inspect the actual product image visually using Florence-2-Large Vision.
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
      signal: AbortSignal.timeout(5000)
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
      signal: AbortSignal.timeout(12000)
    });
    if (!sseResp.ok) return '';
    const text = await sseResp.text();
    const parsed = extractGradioCompleteJson(text);
    const rawCaption = typeof parsed?.[0] === 'string' ? parsed[0].trim() : '';
    if (!rawCaption) return '';

    // Strip out hanger, tag, wooden background, or model pose sentences so only pure garment details remain
    return rawCaption
      .replace(/hanging on a [a-z\s]*hanger/gi, '')
      .replace(/on a [a-z\s]*hanger/gi, '')
      .split(/\.\s+/)
      .filter((s) => !/background is|standing|sitting|looking|expression|hair is|hands on|white tag|blue label|reads/i.test(s))
      .join('. ')
      .trim();
  } catch {
    return '';
  }
}

/**
 * Use DeepSeek V3 to fuse the visual caption, multi-cluster color/pattern structure, and product metadata
 * into a laser-accurate FLUX.1 Kontext garment replacement instruction.
 */
async function synthesizeExactTryOnPrompt(opts: {
  category: string;
  cleanName: string;
  cleanDesc: string;
  visualStructure: string;
  visionCaption: string;
}): Promise<string> {
  const { category, cleanName, cleanDesc, visualStructure, visionCaption } = opts;
  const catLower = category.toLowerCase();

  let defaultDrape = 'fitted naturally with realistic fabric folds, collar, sleeves, and studio lighting';
  if (/saree|shari/i.test(catLower)) {
    defaultDrape = 'draped in traditional Bangladeshi Nivi saree style with pleated front, matching blouse, and ornate pallu over the shoulder';
  } else if (/panjabi/i.test(catLower)) {
    defaultDrape = 'tailored as a Bangladeshi men Panjabi tunic kurta with embroidered mandarin collar and chest placket';
  } else if (/borka|abaya/i.test(catLower)) {
    defaultDrape = 'styled as a modest full-length flowing luxury Abaya Borka gown';
  } else if (/three-?piece|kameez/i.test(catLower)) {
    defaultDrape = 'styled as a Bangladeshi embroidered three-piece salwar kameez tunic with matching trousers and draped dupatta scarf';
  } else if (/shirt/i.test(catLower)) {
    defaultDrape = 'worn as a standalone button-down shirt with visible collar, buttons, full pattern across the chest and sleeves, and cuffs (completely remove any suit jacket, blazer, or coat)';
  }

  const combinedDetails = [
    visualStructure ? `Exact Garment Visual Pattern & Colors: ${visualStructure}` : '',
    visionCaption ? `Vision Inspection of Garment Photo: ${visionCaption}` : '',
    `Product Title: ${cleanName} (${category})`,
    cleanDesc ? `Catalog Notes: ${cleanDesc}` : ''
  ]
    .filter(Boolean)
    .join(' | ');

  if (DEEPSEEK_KEY) {
    try {
      const resp = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          temperature: 0.1,
          max_tokens: 180,
          messages: [
            {
              role: 'system',
              content:
                'You write ultra-precise image-editing prompts for FLUX.1 Kontext virtual try-on. Given visual inspection data of a garment, write a 2-sentence instruction starting with "Completely replace the person\'s current clothing (removing any suit jacket, blazer, or outer coat) so they are wearing ONLY..." Describe the exact base color, secondary pattern/print colors, stripe/floral/paisley/geometric layout, collar, sleeves, and cuffs with 100% fidelity. End with: "Keep the person\'s exact face, hair, skin tone, pose, and background 100% unchanged." Output ONLY the prompt text.'
            },
            {
              role: 'user',
              content: combinedDetails
            }
          ]
        }),
        signal: AbortSignal.timeout(4500)
      });
      if (resp.ok) {
        const j = await resp.json();
        const text = j?.choices?.[0]?.message?.content?.trim();
        if (text && text.length > 30) return text;
      }
    } catch {
      // Fall back to deterministic prompt below
    }
  }

  return `Completely replace the person's current clothing (removing any suit jacket, blazer, or outer coat) so they are wearing ONLY this exact ${category}: ${visualStructure || cleanName}. ${visionCaption ? `Garment details: ${visionCaption}.` : ''} Styled ${defaultDrape}. Keep the person's exact face, facial expression, hairstyle, skin tone, hands, pose, and background 100% identical and unchanged.`;
}

/**
 * Parse Gradio SSE stream to extract the completed file output URL and convert it to a base64 Data URL.
 */
async function readGradioSseAndFetchDataUrl(baseSpaceUrl: string, sseResp: Response): Promise<string | null> {
  const text = await sseResp.text();
  const parsed = extractGradioCompleteJson(text);
  if (!parsed) return null;

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
 * Virtual Garment Try-On powered by FLUX.1 Kontext Dev + Multi-Cluster Visual & Pattern Inspection.
 */
export async function tryOnGarmentFree(opts: {
  userImg: string;
  productImg: string;
  category?: string;
  productName?: string;
  productDescription?: string;
  colorHint?: string;
}): Promise<string | null> {
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

  const [uploadedUserPath, visualStructure, visionCaption, cleanName, cleanDesc] = await Promise.all([
    uploadUserPromise,
    analyzeGarmentVisualStructure(opts.productImg, opts.colorHint),
    describeGarmentImageVisually(opts.productImg),
    translateAndEnhancePrompt((opts.productName || opts.category || 'Traditional Garment').trim()),
    opts.productDescription ? translateAndEnhancePrompt(opts.productDescription.slice(0, 160)) : Promise.resolve('')
  ]);

  const cat = (opts.category || 'Traditional Garment').trim();
  const prompt = await synthesizeExactTryOnPrompt({
    category: cat,
    cleanName,
    cleanDesc,
    visualStructure,
    visionCaption
  });

  return await editImageWithFluxKontext(opts.userImg, prompt, {
    guidanceScale: 2.5,
    steps: 26,
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

  return await editImageWithFluxKontext(image, prompt, { guidanceScale: 2.5, steps: 24 });
}

/**
 * Free Text-to-Image & Reference-to-Image Fashion Generator.
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
        guidanceScale: 2.5,
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
