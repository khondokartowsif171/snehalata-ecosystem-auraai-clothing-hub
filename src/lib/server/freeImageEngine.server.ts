// Free Neural Image & 2-Image Visual Try-On Engine for Snehalata Aura Studio
// Powered by Official Zero-Cost Gradio Spaces:
// 1. FLUX.1 Kontext Dev (black-forest-labs-flux-1-kontext-dev.hf.space) — In-Context Virtual Try-On, Makeup, Style Transfer & Image Remix
// 2. Florence-2 Large Vision Analyzer (prithivmlmods-florence-2-image-caption.hf.space) — Real-time Visual Garment Inspection (Pattern, Print, Collar, Cuffs & Cut)
// 3. FASHN VTON 1.5 (fashn-ai-fashn-vton-1-5.hf.space) & Qwen-Image-Edit-2511 (linoyts-qwen-image-edit-2511-fast.hf.space) — 2-Image Garment Transfer
// 4. FLUX.1 Schnell & FLUX.1 Merged HD — 100% Free Text-to-Image Generation

const SITE_ORIGIN = 'https://www.snehalata.com';

const KONTEXT_SPACE = 'https://black-forest-labs-flux-1-kontext-dev.hf.space';
const FLORENCE_SPACE = 'https://prithivmlmods-florence-2-image-caption.hf.space';
const FASHN_VTON_SPACE = 'https://fashn-ai-fashn-vton-1-5.hf.space';
const QWEN_EDIT_SPACE = 'https://linoyts-qwen-image-edit-2511-fast.hf.space';
const SCHNELL_SPACE = 'https://black-forest-labs-flux-1-schnell.hf.space';
const MERGED_SPACE = 'https://multimodalart-flux-1-merged.hf.space';

// Exact Visual DNA signatures for showcase & Supabase catalog items (keyed by filename)
// Ensures 100% pixel-faithful garment reproduction even when DB titles are generic or mismatched.
const CATALOG_VISUAL_DNA: Record<string, string> = {
  // 13 Showcase Shirts (/products/shirt-1.jpg .. shirt-13.jpg)
  'shirt-1.jpg': 'solid deep burgundy maroon premium cotton formal long-sleeve button-down shirt with classic collar, dark maroon buttons, and a small gold chest emblem',
  'shirt-2.jpg': 'solid dark midnight navy blue textured cotton formal long-sleeve button-down shirt with classic collar and matching dark buttons',
  'shirt-3.jpg': 'solid olive sage green textured cotton formal long-sleeve button-down shirt with classic collar and dark buttons',
  'shirt-4.jpg': 'solid warm cream ivory beige textured cotton formal long-sleeve button-down shirt with classic collar and light buttons',
  'shirt-5.jpg': 'solid sky blue micro-textured cotton formal long-sleeve button-down shirt with white buttons and classic collar',
  'shirt-6.jpg': 'jet-black casual long-sleeve button-down shirt covered edge-to-edge in repeating parallel vertical columns of intricate crisp white geometric tribal and floral embroidery motifs across the entire chest, torso, shoulders, and both sleeves, with rolled-up grey-and-white patterned cuffs',
  'shirt-7.jpg': 'ice-blue / light slate-blue casual long-sleeve button-down shirt featuring subtle white ornamental paisley and floral filigree motifs across the fabric and crisp white rolled-up cuffs',
  'shirt-8.jpg': 'jet-black casual long-sleeve button-down shirt covered in large high-contrast crisp white hibiscus flower and leaf floral prints across the chest and sleeves, with solid white rolled-up cuffs',
  'shirt-9.jpg': 'jet-black casual long-sleeve button-down shirt covered in intricate golden-brown, bronze, and tan paisley ornamental prints all over the torso and sleeves, with crisp white rolled-up cuffs',
  'shirt-10.jpg': 'deep maroon wine casual button-down shirt with two embossed geometric textured chest pockets, black buttons, and rolled-up sleeves',
  'shirt-11.jpg': 'white, grey, and soft blush-pink tie-dye gradient casual button-down shirt with bold white stencil typography lettering print across the chest and dual flap chest pockets with white rolled cuffs',
  'shirt-12.jpg': 'dark maroon streetwear utility button-down shirt featuring bold black-and-white horizontal text tape across the chest, white graphic patch on right pocket, and white SIX patch on left pocket',
  'shirt-13.jpg': 'white casual button-down shirt with horizontal coral-pink and grey abstract tie-dye brush stroke bands across the shoulders, chest, and hem, dual chest flap pockets, and white rolled cuffs',

  // Local T-Shirts (/products/tshirt-1..3.jpg)
  'tshirt-1.jpg': 'olive army green waffle-knit short-sleeve mandarin-collar Henley polo t-shirt with crisp white contrast piping trim along the collar edge and sleeve cuffs and an S emblem on the left chest',
  'tshirt-2.jpg': 'deep dark bottle-green textured cotton short-sleeve mandarin-collar polo t-shirt with crisp white contrast piping trim along the mandarin collar edge and short sleeve cuffs, a 2-button placket, and a small metallic gold S emblem on the left chest',
  'tshirt-3.jpg': 'deep dark bottle-green textured cotton short-sleeve mandarin-collar polo t-shirt with crisp white contrast piping trim along the mandarin collar edge and short sleeve cuffs, a 2-button placket, and a small metallic gold S emblem on the left chest',

  // 11 Live Supabase T-Shirts (#660 .. #670)
  'product-1783882928184-b3qs2c.jpeg': 'deep dark forest-green textured cotton short-sleeve mandarin-collar polo t-shirt with crisp white contrast piping along the mandarin collar edge and short sleeve cuffs, a 2-button placket, and white S SNEHALATA logo on the left chest',
  'product-1783882937577-dwe457.jpeg': 'deep midnight navy-blue textured cotton short-sleeve mandarin-collar polo t-shirt with crisp white contrast piping along the mandarin collar edge and short sleeve cuffs, a 2-button placket, and subtle S emblem on the left chest',
  'product-1783882948427-1ha6yn.jpeg': 'olive army-green textured pique cotton short-sleeve mandarin-collar polo t-shirt with crisp white contrast piping along the mandarin collar edge and short sleeve cuffs, a 2-button placket, and a gold S emblem on the left chest',
  'product-1783882959037-3rtuok.jpeg': 'classic jet-black smooth cotton crew-neck short-sleeve minimalist t-shirt with a small white S SNEHALATA logo on the left chest',
  'product-1783882966607-1hdkgd.jpeg': 'midnight navy-blue smooth cotton crew-neck short-sleeve t-shirt with crisp white SNEHALATA lettering across the center chest and a small white S emblem on the left chest',
  'product-1783882975629-g00kfg.jpeg': 'deep dark bottle-green premium cotton short-sleeve mandarin-collar polo t-shirt with crisp white contrast piping trim along the mandarin collar edge and short sleeve cuffs, a 2-button placket, and a small gold S emblem on the left chest',
  'product-1783882984635-2woj1v.jpeg': 'jet-black premium cotton short-sleeve mandarin-collar polo t-shirt with warm gold/tan contrast piping trim along the mandarin collar edge and short sleeve cuffs, a 2-button placket, and a gold S emblem on the left chest',
  'product-1783883031751-2lzuqh.jpeg': 'classic jet-black premium cotton crew-neck short-sleeve t-shirt with a small crisp white S emblem on the left chest',
  'product-1783883079373-3kxi3i.jpeg': 'olive army-green premium cotton short-sleeve mandarin-collar polo t-shirt with crisp white contrast piping trim along the mandarin collar edge and short sleeve cuffs, a 2-button placket, and a gold S emblem on the left chest',
  'product-1783883087839-6n0m0y.jpeg': 'jet-black textured cotton short-sleeve mandarin-collar polo t-shirt with crisp white contrast piping trim along the mandarin collar edge and short sleeve cuffs, a 2-button placket, and a white S emblem on the left chest',
  'product-1783883097706-2kw083.jpeg': 'classic jet-black premium cotton crew-neck short-sleeve t-shirt with a small white S emblem on the left chest',

  // Sarees (/products/saree-1..13.jpg)
  'saree-1.jpg': 'midnight navy blue handwoven Jamdani silk saree with antique copper-gold zari geometric border, red-and-gold floral buti motifs on the pallu, and matching navy blue blouse',
  'saree-2.jpg': 'traditional Tangail handloom cotton saree with intricate woven heritage border and geometric motifs',
  'saree-3.jpg': 'royal sapphire blue pure silk Jamdani saree with shimmering silver-and-gold zari border and woven floral motifs across the pallu and pleats',
  'saree-4.jpg': 'deep midnight navy-blue handloom Tangail Jamdani saree with antique gold-and-maroon geometric temple border, colorful floral motifs woven on the pallu, and matching navy blouse',
  'saree-5.jpg': 'soft pearl-grey and silver-taupe handloom Jamdani saree with delicate pastel pink and cream floral motifs on the pallu, cream-gold woven border, and matching grey blouse',
  'saree-6.jpg': 'royal cobalt-blue handloom Tangail Jamdani saree with silver-and-gold geometric border and multicolored floral jamdani motifs on the pallu',
  'saree-7.jpg': 'deep bottle-green / forest-green pure silk saree with subtle tonal self-embroidered border and matching sleeveless bottle-green blouse',
  'saree-8.jpg': 'rich crimson-red Rajshahi silk party saree with ornate antique-gold zari floral border, gold floral buti motifs, and matching embroidered long-sleeve red blouse',
  'saree-9.jpg': 'jet-black georgette party saree with shimmering black sequin and beadwork floral border and matching long-sleeve black embellished blouse',
  'saree-10.jpg': 'deep peacock teal-blue shimmering silk saree with tonal teal sequin-embroidered scalloped border and matching sleeveless teal blouse',
  'saree-11.jpg': 'classic jet-black satin-silk party saree with tonal black floral lace-embroidered border and matching sleeveless black blouse',
  'saree-12.jpg': 'dusty mauve-lavender tissue silk saree with intricate rose-gold and silver zari embroidered border and scattered gold floral motifs',
  'saree-13.jpg': 'deep emerald forest-green muslin silk saree with subtle tonal embroidered border and matching sleeveless dark green blouse',

  // Three-Piece Suits (/products/threepiece-1..14.jpg)
  'threepiece-1.jpg': 'deep wine-purple embroidered long kameez tunic with copper-gold neckline and hem embroidery, matching wine-purple straight trousers, and a wine-purple dupatta scarf with ornate gold border',
  'threepiece-2.jpg': 'slate denim-blue embroidered long kameez tunic with ornate copper-red and gold floral embroidery on the neckline and hem border, matching blue straight trousers, and matching blue dupatta scarf with copper-gold border',
  'threepiece-3.jpg': 'warm taupe-grey silk three-piece salwar kameez with antique gold zari embroidery on the neckline, cuffs, and hem, matching taupe trousers, and scalloped organza dupatta',
  'threepiece-4.jpg': 'jet-black raw-silk three-piece salwar kameez with rich copper-gold and coral floral embroidery along the V-neck placket, cuffs, and draped black dupatta border',
  'threepiece-5.jpg': 'deep plum-wine cotton three-piece salwar kameez with rust-orange and gold embroidered neckline, ornate floral border at the hem, matching plum trousers, and bordered dupatta',
  'threepiece-6.jpg': 'indigo denim-blue cotton three-piece salwar kameez with rust-red and gold embroidered neckline, floral daman hem border, matching blue trousers, and striped border dupatta',
  'threepiece-7.jpg': 'deep forest-green silk festive three-piece salwar kameez with rich antique-gold zardozi embroidery on the neckline, hem border, and heavily embroidered green-and-gold dupatta',
  'threepiece-8.jpg': 'soft sage-pistachio green organza-silk three-piece salwar kameez with delicate tonal silver-green floral embroidery on the neckline, hem, and sheer organza dupatta',
  'threepiece-9.jpg': 'dusty rose-pink embroidered festive three-piece salwar kameez with intricate pink-and-gold floral embroidery on the neckline, daman hem, and scalloped organza dupatta',
  'threepiece-10.jpg': 'crisp white cotton three-piece salwar kameez covered in royal porcelain-blue floral block prints with a blue-and-white patterned border dupatta and matching printed trousers',
  'threepiece-11.jpg': 'deep burgundy-maroon festive three-piece salwar kameez with tonal maroon sequin and thread embroidery on the neckline, hem, and sheer maroon organza dupatta',
  'threepiece-12.jpg': 'emerald-green and multicolor floral printed festive three-piece salwar kameez with orange, pink, and gold botanical prints across the kameez and flowing dupatta',
  'threepiece-13.jpg': 'deep bottle-green monochrome embroidered three-piece salwar kameez with tonal dark-green cutwork and sequin embroidery on the neckline, hem, and scalloped organza dupatta',
  'threepiece-14.jpg': 'deep wine-maroon monochrome embroidered festive three-piece salwar kameez with tonal maroon cutwork embroidery on the neckline, hem, and scalloped sheer dupatta',

  // Panjabis (/products/panjabi-1..6.jpg & panjabi-kuthir-1..5.jpg)
  'panjabi-1.jpg': 'tailored Bangladeshi luxury men Panjabi kurta tunic in deep navy blue with intricate tonal blue geometric embroidery along the mandarin collar and chest placket',
  'panjabi-2.jpg': 'tailored Bangladeshi luxury men Panjabi kurta tunic with intricate embroidered mandarin collar and chest placket',
  'panjabi-3.jpg': 'crimson red men Panjabi kurta tunic covered all over in bold black abstract vertical and horizontal brush-stroke hatch patterns with a black-trimmed mandarin collar and metal buttons',
  'panjabi-4.jpg': 'crimson red men Panjabi kurta tunic covered in repeating golden-beige rectangular geometric block-print motifs across the torso and sleeves with an ornate embroidered mandarin collar',
  'panjabi-5.jpg': 'cream off-white men Panjabi kurta tunic covered in vibrant crimson-red and mustard-yellow pinwheel floral swirl prints across the entire fabric with a red-trimmed mandarin collar',
  'panjabi-6.jpg': 'rich teal-blue men Panjabi kurta tunic with subtle self-textured weave and intricate tonal teal geometric embroidery on the mandarin collar and chest button placket',
  'panjabi-kuthir-1.jpg': 'soft mint-sage pastel green self-printed jacquard cotton men Panjabi kurta tunic with intricate darker teal-green geometric embroidery along the mandarin collar, long chest placket, and sleeve cuffs',
  'panjabi-kuthir-2.jpg': 'warm dusty mauve-taupe textured cotton men Panjabi kurta tunic with intricate bronze-brown geometric embroidery along the mandarin collar, chest placket with square buttons, and sleeve cuffs',
  'panjabi-kuthir-3.jpg': 'deep maroon burgundy textured cotton men Panjabi kurta tunic with rich copper-gold geometric embroidery along the mandarin collar, long chest placket, and sleeve cuffs',
  'panjabi-kuthir-4.jpg': 'deep wine-maroon jacquard woven men Panjabi kurta tunic with subtle tonal diamond-check motifs across the fabric and antique gold embroidered trim along the mandarin collar, chest placket, and cuffs',
  'panjabi-kuthir-5.jpg': 'deep emerald forest-green luxury Bangladeshi men Panjabi kurta tunic with rich golden zardozi floral embroidery around the mandarin collar, chest placket, and sleeve cuffs',
  'img_8136.jpg': 'tailored Bangladeshi men contrast Panjabi kurta tunic with embroidered mandarin collar and chest button placket',

  // Borkas (borka-161..164.jpg)
  'borka-161.jpg': 'elegant modest full-length jet-black flowing luxury Abaya Borka gown with shimmering black crystal beadwork embroidery running vertically down the front panel and along the wide bell sleeves, paired with a matching black hijab scarf',
  'borka-162.jpg': 'elegant modest full-length jet-black flowing luxury Abaya Borka gown with intricate black sequin and beadwork floral embroidery along the center front and wide sleeve cuffs, paired with a matching black hijab',
  'borka-163.jpg': 'elegant modest full-length jet-black flowing Abaya Borka gown paired with an olive-green draped chiffon hijab scarf',
  'borka-164.jpg': 'elegant modest full-length flowing luxury Abaya Borka gown with delicate vertical beadwork trim down the front and sleeves, paired with a matching draped hijab',

  // Pants (/products/pant-1..5.jpg)
  'pant-1.jpg': 'classic dark indigo blue slim-fit stretch denim jeans trousers with subtle vintage wash fade on the thighs and contrast tan stitching',
  'pant-2.jpg': 'deep dark-wash midnight indigo slim-fit denim jeans trousers with clean tailoring and leather waistband patch',
  'pant-3.jpg': 'charcoal navy-black slim-fit tactical cargo trousers featuring a side thigh utility flap pocket with zipper and flexible stretch cuffs',
  'pant-4.jpg': 'olive green slim-fit utility cargo trousers with side flap pockets',
  'pant-5.jpg': 'classic khaki-beige tailored cotton gabardine chino trousers'
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
 * Multi-Cluster Spatial Color & Pattern Analyzer for Flat-Lay Garments.
 * IMPORTANT: Never runs raw pixel-box sampling on model/banner photos (where background rooms/screens would pollute colors).
 */
export async function analyzeGarmentVisualStructure(
  imageRef: string,
  visionCaption = '',
  productTitle = ''
): Promise<string> {
  const basename = (imageRef.split('/').pop() || '').split('?')[0].toLowerCase();
  if (CATALOG_VISUAL_DNA[basename]) {
    return CATALOG_VISUAL_DNA[basename];
  }

  // If Florence-2 vision detected a human model or ad banner text, or if the product title already names an explicit color,
  // do NOT run the raw pixel-box sampler (which would sample background walls, chandeliers, or skin tones).
  const isModelOrBannerPhoto =
    /\b(man|woman|person|boy|girl|model|standing|sitting|smiling|wearing|text that reads|collection|shop now|chandelier|room)\b/i.test(
      visionCaption
    );
  const titleHasExplicitColor =
    /\b(green|blue|navy|black|white|red|maroon|burgundy|olive|yellow|mustard|gold|pink|rose|purple|wine|violet|teal|cyan|grey|gray|charcoal|brown|beige|cream|ivory|orange|coral)\b/i.test(
      productTitle
    );

  if (isModelOrBannerPhoto || titleHasExplicitColor) {
    return '';
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

    // Sample only the tight center garment fabric region (x: 30%..70%, y: 35%..75%), skipping neck tag box
    for (let y = Math.floor(H * 0.35); y < Math.floor(H * 0.75); y++) {
      for (let x = Math.floor(W * 0.3); x < Math.floor(W * 0.7); x++) {
        if (x > W * 0.42 && x < W * 0.58 && y > H * 0.35 && y < H * 0.52) continue;
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
      .filter(([, c]) => c / totalSampled >= 0.15)
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
 * Preserves the exact sentence describing what garment the model is wearing or what is on the hanger!
 */
export async function describeGarmentImageVisually(productImgRef: string): Promise<{
  cleanGarmentCaption: string;
  rawCaption: string;
  isCatalogExactMatch: boolean;
}> {
  const basename = (productImgRef.split('/').pop() || '').split('?')[0].toLowerCase();
  if (CATALOG_VISUAL_DNA[basename]) {
    return {
      cleanGarmentCaption: CATALOG_VISUAL_DNA[basename],
      rawCaption: CATALOG_VISUAL_DNA[basename],
      isCatalogExactMatch: true
    };
  }

  try {
    const { buffer, mimeType, ext } = await resolveImageBuffer(productImgRef);
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    const form = new FormData();
    form.append('files', blob, `garment.${ext}`);

    const upResp = await fetch(`${FLORENCE_SPACE}/gradio_api/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(5500)
    });
    if (!upResp.ok) return { cleanGarmentCaption: '', rawCaption: '', isCatalogExactMatch: false };
    const upPaths = await upResp.json();
    const uploadedPath = Array.isArray(upPaths) ? upPaths[0] : null;
    if (!uploadedPath) return { cleanGarmentCaption: '', rawCaption: '', isCatalogExactMatch: false };

    const callResp = await fetch(`${FLORENCE_SPACE}/gradio_api/call/describe_image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{ path: uploadedPath, meta: { _type: 'gradio.FileData' } }, 'Florence-2-large']
      }),
      signal: AbortSignal.timeout(5500)
    });
    if (!callResp.ok) return { cleanGarmentCaption: '', rawCaption: '', isCatalogExactMatch: false };
    const { event_id } = await callResp.json();
    if (!event_id) return { cleanGarmentCaption: '', rawCaption: '', isCatalogExactMatch: false };

    const sseResp = await fetch(`${FLORENCE_SPACE}/gradio_api/call/describe_image/${event_id}`, {
      signal: AbortSignal.timeout(12000)
    });
    if (!sseResp.ok) return { cleanGarmentCaption: '', rawCaption: '', isCatalogExactMatch: false };
    const text = await sseResp.text();
    const parsed = extractGradioCompleteJson(text);
    const rawCaption = typeof parsed?.[0] === 'string' ? parsed[0].trim() : '';
    if (!rawCaption) return { cleanGarmentCaption: '', rawCaption: '', isCatalogExactMatch: false };

    // Cleanly extract ONLY the wearable garment sentences without deleting "standing/wearing" sentences!
    const sentences = rawCaption
      .replace(/hanging on a [a-z\s]*hanger/gi, '')
      .replace(/on a [a-z\s]*hanger/gi, '')
      .split(/\.\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) =>
        s
          // Strip leading "The image shows a young man standing in a luxurious room with a chandelier in the background" ONLY if it doesn't contain "wearing"
          .replace(/^The image shows (?:a|an) [^.]*?\b(?:wearing|dressed in)\s+/i, '')
          .replace(/^(?:He|She|The man|The woman|The model|The person) is (?:wearing|dressed in)\s+/i, '')
      )
      .filter(
        (s) =>
          !/^(?:The image shows (?:a|an) (?:young |handsome )?(?:man|woman|person|boy|girl) (?:standing|sitting|posing) in|He has a beard|She has|On the (?:right|left) side of the image|Below the text|The text also|There is (?:also )?a "(?:Shop Now|Buy)|There is a small white tag|The background is)/i.test(
            s
          )
      );

    return {
      cleanGarmentCaption: sentences.join('. ').trim(),
      rawCaption,
      isCatalogExactMatch: false
    };
  } catch {
    return { cleanGarmentCaption: '', rawCaption: '', isCatalogExactMatch: false };
  }
}

/**
 * Build a 100% deterministic, image-first garment replacement instruction.
 * Never allows a mismatched DB title or background-room color to override the actual visual garment!
 */
function buildExactTryOnPrompt(opts: {
  category: string;
  cleanName: string;
  cleanDesc: string;
  visualStructure: string;
  visionCaption: string;
  isCatalogExactMatch: boolean;
}): string {
  const { category, cleanName, cleanDesc, visualStructure, visionCaption, isCatalogExactMatch } = opts;
  const catLower = category.toLowerCase();

  let removalClause =
    "Completely replace the person's current clothing (removing any suit jacket, blazer, coat, or previous top)";
  let fitClause = 'fitted naturally with realistic fabric folds, collar, sleeves, and studio lighting';

  if (/saree|shari/i.test(catLower)) {
    fitClause =
      'draped in traditional Bangladeshi Nivi saree style with pleated front, matching fitted blouse, and ornate pallu draped over the shoulder';
  } else if (/panjabi/i.test(catLower)) {
    fitClause =
      'tailored as a Bangladeshi men Panjabi tunic kurta with embroidered mandarin collar and chest button placket';
  } else if (/borka|abaya/i.test(catLower)) {
    fitClause = 'styled as a modest full-length flowing luxury Abaya Borka gown';
  } else if (/three-?piece|kameez/i.test(catLower)) {
    fitClause =
      'styled as a Bangladeshi embroidered three-piece salwar kameez tunic with matching trousers and draped dupatta scarf';
  } else if (/t-?shirt|polo/i.test(catLower)) {
    fitClause =
      'worn as a standalone short-sleeve shirt/polo on the torso with bare forearms visible (completely remove any suit jacket, blazer, or long-sleeve outer coat)';
  } else if (/shirt/i.test(catLower)) {
    fitClause =
      'worn as a standalone button-down shirt with visible collar, buttons, full pattern across the chest and sleeves, and cuffs (completely remove any suit jacket, blazer, or outer coat)';
  } else if (/pant|trouser|jeans/i.test(catLower)) {
    removalClause = "Replace the person's lower-body trousers/pants";
    fitClause = 'tailored naturally on the lower body with realistic denim/cotton folds';
  }

  // If we have an exact human-verified visual DNA signature for this image filename, use it as the sole ground truth
  // (preventing mismatched database titles like "Casual Check Shirt" on solid navy shirt-2.jpg from confusing the model).
  if (isCatalogExactMatch && visualStructure) {
    return `${removalClause} so they are wearing ONLY this exact garment: ${visualStructure}. Styled ${fitClause}. Keep the person's exact face, facial expression, beard, hairstyle, skin tone, pose, and background 100% identical and unchanged.`;
  }

  // Otherwise, combine BOTH the translated product title AND the cleaned Florence-2 visual garment caption
  const parts = [
    cleanName ? `${cleanName} (${category})` : category,
    visionCaption ? `Visual details from product photo: ${visionCaption}` : '',
    visualStructure ? `Fabric pattern & color profile: ${visualStructure}` : '',
    cleanDesc ? `Style notes: ${cleanDesc}` : ''
  ].filter(Boolean);

  return `${removalClause} so they are wearing ONLY this exact garment: ${parts.join('. ')}. Styled ${fitClause}. Keep the person's exact face, facial expression, beard, hairstyle, skin tone, pose, and background 100% identical and unchanged.`;
}

/**
 * Parse Gradio SSE stream to extract the completed file output URL and convert it to a base64 Data URL.
 */
async function readGradioSseAndFetchDataUrl(baseSpaceUrl: string, sseResp: Response): Promise<string | null> {
  const text = await sseResp.text();
  const parsed = extractGradioCompleteJson(text);
  if (!parsed) return null;

  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  const firstItem = Array.isArray(first) ? first[0] : first;
  const fileObj = firstItem?.image || firstItem;
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
 * True 2-Image Pixel-Exact Virtual Try-On via FASHN VTON 1.5 (fashn-ai-fashn-vton-1-5.hf.space).
 * Takes BOTH person_image AND garment_image directly and warps the exact garment onto the person.
 */
export async function tryOnWithFashnVton(opts: {
  userImg: string;
  productImg: string;
  category?: string;
  isModelPhoto?: boolean;
}): Promise<string | null> {
  const catLower = (opts.category || '').toLowerCase();
  let vtonCategory: 'tops' | 'bottoms' | 'one-pieces' = 'tops';
  if (/pant|trouser|jeans|salwar|pajama/i.test(catLower)) {
    vtonCategory = 'bottoms';
  } else if (/saree|shari|borka|abaya|three-?piece|kameez|dress|gown/i.test(catLower)) {
    vtonCategory = 'one-pieces';
  }

  const photoType: 'model' | 'flat-lay' = opts.isModelPhoto ? 'model' : 'flat-lay';

  const uploadOne = async (ref: string, label: string) => {
    const { buffer, mimeType, ext } = await resolveImageBuffer(ref);
    const form = new FormData();
    form.append('files', new Blob([new Uint8Array(buffer)], { type: mimeType }), `${label}.${ext}`);
    const r = await fetch(`${FASHN_VTON_SPACE}/gradio_api/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) throw new Error(`FASHN upload failed (${r.status})`);
    const j = await r.json();
    return Array.isArray(j) ? j[0] : null;
  };

  const [pPath, gPath] = await Promise.all([
    uploadOne(opts.userImg, 'person'),
    uploadOne(opts.productImg, 'garment')
  ]);
  if (!pPath || !gPath) return null;

  const callResp = await fetch(`${FASHN_VTON_SPACE}/gradio_api/call/try_on`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [
        { path: pPath, meta: { _type: 'gradio.FileData' } },
        { path: gPath, meta: { _type: 'gradio.FileData' } },
        vtonCategory,
        photoType,
        30,
        1.5,
        42,
        true
      ]
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!callResp.ok) return null;
  const { event_id } = await callResp.json();
  if (!event_id) return null;

  const sseResp = await fetch(`${FASHN_VTON_SPACE}/gradio_api/call/try_on/${event_id}`, {
    signal: AbortSignal.timeout(35000)
  });
  if (!sseResp.ok) return null;
  return await readGradioSseAndFetchDataUrl(FASHN_VTON_SPACE, sseResp);
}

/**
 * True 2-Image Multi-Modal Garment Try-On via Qwen-Image-Edit-2511 (passes [userImg, productImg] together).
 */
export async function tryOnWithQwenMultiImage(
  userImg: string,
  productImg: string,
  prompt: string
): Promise<string | null> {
  const uploadOne = async (ref: string, label: string) => {
    const { buffer, mimeType, ext } = await resolveImageBuffer(ref);
    const form = new FormData();
    form.append('files', new Blob([new Uint8Array(buffer)], { type: mimeType }), `${label}.${ext}`);
    const r = await fetch(`${QWEN_EDIT_SPACE}/gradio_api/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) throw new Error(`Qwen upload failed (${r.status})`);
    const j = await r.json();
    return Array.isArray(j) ? j[0] : null;
  };

  const [pPath, gPath] = await Promise.all([uploadOne(userImg, 'person'), uploadOne(productImg, 'garment')]);
  if (!pPath || !gPath) return null;

  const callResp = await fetch(`${QWEN_EDIT_SPACE}/gradio_api/call/infer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [
        [
          { image: { path: pPath, meta: { _type: 'gradio.FileData' } }, caption: null },
          { image: { path: gPath, meta: { _type: 'gradio.FileData' } }, caption: null }
        ],
        `Photorealistic virtual try-on: Take the person in image 1 and dress them in the exact garment shown in image 2. ${prompt}`,
        42,
        false,
        1.0,
        4,
        1024,
        768,
        true
      ]
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!callResp.ok) return null;
  const { event_id } = await callResp.json();
  if (!event_id) return null;

  const sseResp = await fetch(`${QWEN_EDIT_SPACE}/gradio_api/call/infer/${event_id}`, {
    signal: AbortSignal.timeout(30000)
  });
  if (!sseResp.ok) return null;
  return await readGradioSseAndFetchDataUrl(QWEN_EDIT_SPACE, sseResp);
}

/**
 * Upload an image buffer to FLUX.1 Kontext Dev and run in-context editing.
 * Returns a self-contained data:image/webp;base64,... URL.
 */
export async function editImageWithFluxKontext(
  imageRef: string,
  prompt: string,
  options?: { guidanceScale?: number; steps?: number; seed?: number; preUploadedPath?: string }
): Promise<string | null> {
  let uploadedPath = options?.preUploadedPath || null;

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

  if (!uploadedPath) throw new Error('Kontext upload returned no file path');

  const guidance = options?.guidanceScale ?? 2.5;
  const steps = options?.steps ?? 26;
  const seed = options?.seed ?? 42;

  const callResp = await fetch(`${KONTEXT_SPACE}/gradio_api/call/infer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [
        { path: uploadedPath, meta: { _type: 'gradio.FileData' } },
        prompt,
        seed,
        false,
        guidance,
        steps
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
 * Virtual Garment Try-On powered by Vision-Grounded FLUX.1 Kontext Dev + 2-Image FASHN VTON 1.5 + Qwen Multi-Image.
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
  })().catch(() => null);

  const [uploadedUserPath, visionData, cleanName, cleanDesc] = await Promise.all([
    uploadUserPromise,
    describeGarmentImageVisually(opts.productImg),
    translateAndEnhancePrompt((opts.productName || opts.category || 'Traditional Garment').trim()),
    opts.productDescription ? translateAndEnhancePrompt(opts.productDescription.slice(0, 140)) : Promise.resolve('')
  ]);

  const visualStructure = await analyzeGarmentVisualStructure(
    opts.productImg,
    visionData.rawCaption,
    cleanName
  );

  const cat = (opts.category || 'Traditional Garment').trim();
  const prompt = buildExactTryOnPrompt({
    category: cat,
    cleanName,
    cleanDesc,
    visualStructure,
    visionCaption: visionData.cleanGarmentCaption,
    isCatalogExactMatch: visionData.isCatalogExactMatch
  });

  // Primary Lane: FLUX.1 Kontext Dev with exact visual DNA / cleaned Florence-2 garment vision
  try {
    const kontextOut = await editImageWithFluxKontext(opts.userImg, prompt, {
      guidanceScale: 3.0,
      steps: 28,
      preUploadedPath: uploadedUserPath || undefined
    });
    if (kontextOut) return kontextOut;
  } catch (e: any) {
    console.warn('[tryOnGarmentFree] Kontext primary lane error:', e?.message);
  }

  // Secondary Lane: True 2-Image FASHN VTON 1.5 (passes BOTH userImg and productImg directly)
  try {
    const isModelPhoto = /\b(man|woman|person|model|wearing|standing|sitting)\b/i.test(visionData.rawCaption);
    const vtonOut = await tryOnWithFashnVton({
      userImg: opts.userImg,
      productImg: opts.productImg,
      category: cat,
      isModelPhoto
    });
    if (vtonOut) return vtonOut;
  } catch (e: any) {
    console.warn('[tryOnGarmentFree] FASHN VTON secondary lane error:', e?.message);
  }

  // Tertiary Lane: True 2-Image Qwen-Image-Edit-2511 (passes [userImg, productImg] gallery)
  try {
    const qwenOut = await tryOnWithQwenMultiImage(opts.userImg, opts.productImg, prompt);
    if (qwenOut) return qwenOut;
  } catch (e: any) {
    console.warn('[tryOnGarmentFree] Qwen multi-image tertiary lane error:', e?.message);
  }

  return null;
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
  const prompt = `Transform the artistic lighting, atmosphere, and color grading of this fashion portrait into "${cleanStyle}" style while preserving the person's exact facial identity, features, clothing design, and pose.`;

  return await editImageWithFluxKontext(image, prompt, { guidanceScale: 2.5, steps: 24 });
}

/**
 * 100% Free Text-to-Image Generator (with optional Reference Image Remix via FLUX.1 Kontext Dev).
 */
export async function generateFashionImageFree(opts: {
  prompt: string;
  referenceImage?: string | null;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  quality?: 'turbo' | 'hd';
}): Promise<{ image: string; engine: string } | null> {
  const cleanPrompt = await translateAndEnhancePrompt(opts.prompt);
  const fullPrompt = `${cleanPrompt}, photorealistic luxury South Asian Bangladeshi fashion photography, ultra-detailed fabric texture, studio lighting, 8k resolution`;

  if (opts.referenceImage) {
    const edited = await editImageWithFluxKontext(
      opts.referenceImage,
      `${fullPrompt}. Preserve the subject's core composition while transforming according to the instruction.`,
      { guidanceScale: 2.8, steps: 26 }
    );
    if (edited) return { image: edited, engine: 'flux-kontext-free' };
  }

  let width = 768;
  let height = 1024;
  if (opts.aspectRatio === '1:1') {
    width = 1024;
    height = 1024;
  } else if (opts.aspectRatio === '16:9') {
    width = 1024;
    height = 576;
  } else if (opts.aspectRatio === '4:3') {
    width = 1024;
    height = 768;
  } else if (opts.aspectRatio === '9:16') {
    width = 576;
    height = 1024;
  }

  if (opts.quality === 'hd') {
    try {
      const callResp = await fetch(`${MERGED_SPACE}/gradio_api/call/infer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [fullPrompt, 0, true, width, height, 3.5, 8]
        }),
        signal: AbortSignal.timeout(12000)
      });
      if (callResp.ok) {
        const { event_id } = await callResp.json();
        if (event_id) {
          const sseResp = await fetch(`${MERGED_SPACE}/gradio_api/call/infer/${event_id}`, {
            signal: AbortSignal.timeout(35000)
          });
          if (sseResp.ok) {
            const img = await readGradioSseAndFetchDataUrl(MERGED_SPACE, sseResp);
            if (img) return { image: img, engine: 'flux-merged-hd' };
          }
        }
      }
    } catch {
      // Fall through to Schnell Turbo
    }
  }

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

  const img = await readGradioSseAndFetchDataUrl(SCHNELL_SPACE, sseResp);
  if (!img) return null;
  return { image: img, engine: 'flux-schnell-free' };
}
