// Free Neural Image & True 2-Image Visual Try-On Engine for Snehalata Aura Studio
// Powered by Official Zero-Cost Gradio Spaces:
// 1. FLUX.1 Kontext Dev 2-Panel Diptych & In-Context Try-On (black-forest-labs-flux-1-kontext-dev.hf.space)
// 2. FASHN VTON 1.5 (fashn-ai-fashn-vton-1-5.hf.space) — Dedicated 2-Image Pixel-Exact Virtual Try-On
// 3. Qwen-Image-Edit-2511 (linoyts-qwen-image-edit-2511-fast.hf.space) — Multi-Image [Person, Garment] Editor
// 4. Florence-2 Large Vision Analyzer (prithivmlmods-florence-2-image-caption.hf.space) — Real-time Visual Garment Inspection
// 5. FLUX.1 Schnell & FLUX.1 Merged HD — 100% Free Text-to-Image Generation

const SITE_ORIGIN = 'https://www.snehalata.com';

const KONTEXT_SPACE = 'https://black-forest-labs-flux-1-kontext-dev.hf.space';
const FLORENCE_SPACE = 'https://prithivmlmods-florence-2-image-caption.hf.space';
const FASHN_VTON_SPACE = 'https://fashn-ai-fashn-vton-1-5.hf.space';
const LEFFA_VTON_SPACE = 'https://franciszzj-leffa.hf.space';
const CATVTON_SPACE = 'https://multimodalart-catvton-zerogpu.hf.space';
const QWEN_EDIT_SPACE = 'https://linoyts-qwen-image-edit-2511-fast.hf.space';
const SCHNELL_SPACE = 'https://black-forest-labs-flux-1-schnell.hf.space';
const MERGED_SPACE = 'https://multimodalart-flux-1-merged.hf.space';

// For banner photos where the model's arms/hands cross over the stomach/chest, map to their exact unobstructed studio hanger twin
const UNOBSTRUCTED_HANGER_TWINS: Record<string, string> = {
  'product-1783882975629-g00kfg.jpeg': '/products/tshirt-2.jpg',
  'product-1783883079373-3kxi3i.jpeg': '/products/tshirt-1.jpg'
};

// Known flat-lay / hanger product photos (no human model wearing them)
const FLAT_LAY_BASENAMES = new Set([
  'shirt-1.jpg', 'shirt-2.jpg', 'shirt-3.jpg', 'shirt-4.jpg', 'shirt-5.jpg',
  'shirt-6.jpg', 'shirt-7.jpg', 'shirt-8.jpg', 'shirt-9.jpg', 'shirt-10.jpg',
  'shirt-11.jpg', 'shirt-12.jpg', 'shirt-13.jpg',
  'tshirt-1.jpg', 'tshirt-2.jpg', 'tshirt-3.jpg', 'tshirt-4.jpg', 'tshirt-5.jpg',
  'pant-1.jpg', 'pant-2.jpg'
]);

// Known square (1:1) promotional banners where the left ~40% is ad text and the right ~60% is the model/garment
const LEFT_BANNER_BASENAMES = new Set([
  'product-1783882975629-g00kfg.jpeg',
  'product-1783882984635-2woj1v.jpeg',
  'product-1783883031751-2lzuqh.jpeg',
  'product-1783883079373-3kxi3i.jpeg',
  'product-1783883097706-2kw083.jpeg',
  'borka-161.jpg', 'borka-162.jpg', 'borka-163.jpg', 'borka-164.jpg',
  'panjabi-kuthir-1.jpg', 'panjabi-kuthir-2.jpg', 'panjabi-kuthir-3.jpg', 'panjabi-kuthir-4.jpg', 'panjabi-kuthir-5.jpg',
  'tshirt-1.jpg', 'tshirt-2.jpg', 'tshirt-3.jpg', 'tshirt-4.jpg',
  'shirt-1.jpg', 'shirt-2.jpg', 'shirt-3.jpg', 'shirt-4.jpg', 'shirt-5.jpg'
]);

// Exact Visual DNA signatures for showcase & Supabase catalog items (keyed by filename)
// Ensures 100% pixel-faithful garment reproduction even when DB titles are generic or mismatched.
const CATALOG_VISUAL_DNA: Record<string, string> = {
  // 13 Showcase Shirts (/products/shirt-1.jpg .. shirt-13.jpg)
  'shirt-1.jpg': 'solid deep burgundy maroon premium cotton formal long-sleeve button-down shirt with classic collar, dark maroon buttons, and a small standalone gold letter S on the left chest',
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
  'tshirt-1.jpg': 'solid olive army-green smooth cotton short-sleeve Henley t-shirt with a short upright collarless Chinese band neckband (NO fold-down collar flaps, NO lapels) edged with a single thin white piping line along the top rim, a V-notch placket with 2 small dark olive-black buttons (NO white buttons), short sleeves with a single thin white edge line on the cuff hem (NO double stripes), and a small plain standalone letter S on the left chest (NO circle, wreath, or crest around the S)',
  'tshirt-2.jpg': 'solid deep dark bottle-green smooth cotton short-sleeve Henley t-shirt with a short upright collarless Chinese band neckband (NO fold-down collar flaps, NO lapels) edged with a single thin white piping line along the top rim, a V-notch placket with 2 small dark green-black buttons (NO white buttons), short sleeves with a single thin white edge line on the cuff hem (NO double stripes), and a small plain standalone letter S on the left chest (NO circle, wreath, or crest around the S)',
  'tshirt-3.jpg': 'solid deep dark bottle-green smooth cotton short-sleeve Henley t-shirt with a short upright collarless Chinese band neckband (NO fold-down collar flaps, NO lapels) edged with a single thin white piping line along the top rim, a V-notch placket with 2 small dark green-black buttons (NO white buttons), short sleeves with a single thin white edge line on the cuff hem (NO double stripes), and a small plain standalone letter S on the left chest (NO circle, wreath, or crest around the S)',

  // 11 Live Supabase T-Shirts (#660 .. #670)
  'product-1783882928184-b3qs2c.jpeg': 'solid deep dark forest-green smooth cotton short-sleeve Henley t-shirt with a short upright collarless Chinese band neckband (NO fold-down collar flaps, NO lapels) edged with a single thin white piping line along the top rim, a 2-button placket with small dark buttons (NO white buttons), short sleeves with a single thin white edge line on the cuff hem (NO double stripes), and a small plain white letter S on the left chest (NO circle or crest)',
  'product-1783882937577-dwe457.jpeg': 'solid deep midnight navy-blue smooth cotton short-sleeve Henley t-shirt with a short upright collarless Chinese band neckband (NO fold-down collar flaps, NO lapels) edged with a single thin white piping line along the top rim, a 2-button placket with small dark buttons, short sleeves with a single thin white edge line on the cuff hem, and a small plain letter S on the left chest (NO circle or crest)',
  'product-1783882948427-1ha6yn.jpeg': 'solid olive army-green textured pique cotton short-sleeve Henley t-shirt with a short upright collarless Chinese band neckband (NO fold-down collar flaps, NO lapels) edged with a single thin white piping line along the top rim, a 2-button placket with small dark buttons, short sleeves with a single thin white edge line on the cuff hem, and a small plain gold letter S on the left chest (NO circle or crest)',
  'product-1783882959037-3rtuok.jpeg': 'classic jet-black smooth cotton crew-neck short-sleeve minimalist t-shirt with a small plain white S SNEHALATA text logo on the left chest (NO crest)',
  'product-1783882966607-1hdkgd.jpeg': 'midnight navy-blue smooth cotton crew-neck short-sleeve t-shirt with crisp white SNEHALATA lettering across the center chest and a small white letter S on the left chest',
  'product-1783882975629-g00kfg.jpeg': 'solid deep dark bottle-green smooth cotton short-sleeve Henley t-shirt featuring a short upright collarless Chinese mandarin band neckband (strictly a flat upright band around the neck with a small V-notch opening at the throat — NO fold-down collar flaps and NO lapels) edged with a single thin crisp white line along the top rim of the neckband, a placket with 2 small dark green-black buttons (NO white buttons), short sleeves with a single thin crisp white line along the bottom edge of each cuff (NO double stripes), and a small plain standalone beige-gold outlined letter S on the left chest (strictly just the single letter S with NO circle, NO wreath, and NO crest around it)',
  'product-1783882984635-2woj1v.jpeg': 'solid jet-black smooth cotton short-sleeve Henley t-shirt featuring a short upright collarless Chinese mandarin band neckband (strictly a flat upright band around the neck with NO fold-down collar flaps) edged with a single thin warm gold/tan piping line along the top rim, a placket with 2 small black buttons, short sleeves with a single thin gold/tan line on the cuff edge, and a small plain standalone gold letter S on the left chest (NO circle or crest around the S)',
  'product-1783883031751-2lzuqh.jpeg': 'classic jet-black smooth cotton crew-neck short-sleeve t-shirt with a small plain standalone white letter S on the left chest (NO circle or crest)',
  'product-1783883079373-3kxi3i.jpeg': 'solid olive army-green smooth cotton short-sleeve Henley t-shirt featuring a short upright collarless Chinese mandarin band neckband (NO fold-down collar flaps) edged with a single thin crisp white line along the top rim, a placket with 2 small dark buttons, short sleeves with a single thin white line on the cuff edge, and a small plain standalone beige-gold letter S on the left chest (NO circle or crest)',
  'product-1783883087839-6n0m0y.jpeg': 'solid jet-black smooth cotton short-sleeve Henley t-shirt featuring a short upright collarless Chinese mandarin band neckband (NO fold-down collar flaps) edged with a single thin crisp white line along the top rim, a placket with 2 small black buttons, short sleeves with a single thin white line on the cuff edge, and a small plain standalone white letter S on the left chest (NO circle or crest)',
  'product-1783883097706-2kw083.jpeg': 'classic jet-black smooth cotton crew-neck short-sleeve t-shirt with a small plain standalone white letter S on the left chest (NO circle or crest)',

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
  'pant-5.jpg': 'classic khaki-beige tailored cotton gabardine chino trousers',

  // Kids / Baby Collection & Formal Blazers/Suits (/products/baby-1..11.jpg)
  'baby-1.jpg': 'tailored kids festive 3-piece outfit featuring a deep midnight navy-blue cotton Panjabi kurta and matching navy trousers worn under a sleeveless cream-beige textured Nehru waistcoat (Koti) with 4 dark buttons, welt pockets, and a navy pocket square',
  'baby-2.jpg': 'pastel mint-sage silk festive Panjabi kurta with intricate cream-and-gold embroidery around the mandarin collar and placket with a beige pocket square, paired with cream-white pajama trousers',
  'baby-3.jpg': 'pastel sage-mint cotton Panjabi kurta with a white-and-beige geometric embroidered button placket, chest pocket with printed pocket square, rolled-up sleeves, and matching sage-mint tailored trousers',
  'baby-4.jpg': 'pastel blush-pink layered floral tulle party frock dress featuring a white floral lace Peter Pan collar, sheer 3/4 bell sleeves with white lace trim, and delicate pink-and-green floral embroidery across the tiered skirt',
  'baby-5.jpg': 'deep emerald bottle-green chiffon party frock dress featuring gold-and-peach floral vine embroidery on the pleated bodice, white pearl buttons down the chest, flutter ruffle sleeves, and a large emerald satin bow with pearl brooch at the waist',
  'baby-6.jpg': 'royal amethyst lavender-purple layered ruffle tulle party frock dress featuring 3D lavender floral appliqués with pearl centers on the bodice, sheer layered flutter sleeves, and a purple satin waist bow with pearl clasp',
  'baby-7.jpg': 'soft peach-champagne floral embroidered layered tulle party frock dress featuring a white scalloped lace collar, sheer bell sleeves with lace trim, and delicate pastel pink rose embroidery across the tiered tulle skirt',
  'baby-8.jpg': 'royal midnight navy-blue layered tulle party frock dress featuring a pleated sleeveless bodice with 3D navy floral pearl appliqués on the right shoulder and a large navy satin bow with crystal-pearl brooch at the waist',
  'baby-9.jpg': 'sleek all-black tailored 3-piece formal suit featuring a single-breasted black blazer jacket with satin peak lapels and black pocket square, worn over a jet-black button-down dress shirt and tailored black formal trousers with a black leather belt',
  'baby-10.jpg': 'classic all-black single-breasted formal tuxedo suit featuring a tailored black blazer with textured lapels and pocket square, worn over a black dress shirt and matching tailored black dress trousers',
  'baby-11.jpg': 'smart-casual 2-piece outfit featuring a warm cream-beige linen-cotton mandarin-collar button-down shirt with dark contrast buttons and rolled-up sleeves, paired with dark chocolate-brown tailored chino trousers'
};

export type GarmentClass =
  | 'saree'
  | 'three-piece'
  | 'borka'
  | 'blazer'
  | 'panjabi'
  | 'pant'
  | 'baby'
  | 't-shirt'
  | 'shirt'
  | 'undergarments'
  | 'other';

/**
 * Universal Garment Taxonomy Classifier for Current & Future Vendors (Bengali + English + Vision).
 * Accurately categorizes Three-Piece, Saree, Jeans/Pant, Kids/Baby, Blazer/Suit/Koti, Borka/Abaya, Panjabi, T-Shirt, and Shirt.
 */
export function classifyGarmentCategory(
  category = '',
  productName = '',
  productDesc = '',
  visionCaption = '',
  imageRef = ''
): {
  kind: GarmentClass;
  vtonCategory: 'tops' | 'bottoms' | 'one-pieces';
  leffaCategory: 'upper_body' | 'lower_body' | 'dresses';
  catvtonCategory: 'upper' | 'lower' | 'overall';
  isChildGarment: boolean;
} {
  const basename = (imageRef.split('/').pop() || '').split('?')[0].toLowerCase();
  const combined = `${category} ${productName} ${productDesc} ${visionCaption} ${basename}`.toLowerCase();
  const catOnly = `${category} ${productName}`.toLowerCase();

  const isChildGarment =
    /^baby-\d+\./i.test(basename) ||
    /(?:\b(?:baby|kids?|child|children|toddler|junior|infant|boy'?s|girl'?s|frock)\b|বেবি|বাচ্চা|বাচ্চাদের|শিশু|শিশুদের|ছোটদের|কিডস|ফ্রক)/i.test(
      catOnly
    );

  // 1. Saree / Shari
  if (/(?:\b(?:saree|sari|shari|jamdani|katan|muslin|benarasi|tangail)\b|শাড়ি|শাড়ি|জামদানি|কাতান|মসলিন|তাঁত)/i.test(combined)) {
    return {
      kind: 'saree',
      vtonCategory: 'one-pieces',
      leffaCategory: 'dresses',
      catvtonCategory: 'overall',
      isChildGarment
    };
  }

  // 2. Three-Piece / Salwar Kameez / Kurti Set
  if (
    /(?:\b(?:three-?piece|3-?piece|salwar|shalwar|kameez|kamiz|kurti|lehenga|gharara|sharara)\b|থ্রি-?পিস|থ্রি পিস|থ্রিপিস|সালোয়ার|কামিজ|কুর্তি|লেহেঙ্গা|ওড়না)/i.test(
      combined
    )
  ) {
    return {
      kind: 'three-piece',
      vtonCategory: 'one-pieces',
      leffaCategory: 'dresses',
      catvtonCategory: 'overall',
      isChildGarment
    };
  }

  // 3. Borka / Abaya / Modest Gown
  if (/(?:\b(?:borka|burqa|abaya|hijab|khimar|jilbab|niqab)\b|বোরকা|আবায়া|হিজাব|খিমার|জিলবাব)/i.test(combined)) {
    return {
      kind: 'borka',
      vtonCategory: 'one-pieces',
      leffaCategory: 'dresses',
      catvtonCategory: 'overall',
      isChildGarment
    };
  }

  // 4. Blazer / Suit / Coat / Tuxedo / Sherwani / Waistcoat (Koti) / Jacket
  if (
    /(?:\b(?:blazer|suit|tuxedo|coat|overcoat|sherwani|waistcoat|koti|nehru jacket|jacket|hoodie|cardigan)\b|ব্লেজার|স্যুট|কোট|শেরওয়ানি|কটি|ওয়েস্টকোট|জ্যাকেট|হুডি)/i.test(
      combined
    )
  ) {
    const isFullSuit = /(?:\b(?:suit|tuxedo|3-?piece|2-?piece|trouser|pant)\b|স্যুট)/i.test(combined);
    return {
      kind: 'blazer',
      vtonCategory: isFullSuit ? 'one-pieces' : 'tops',
      leffaCategory: isFullSuit ? 'dresses' : 'upper_body',
      catvtonCategory: isFullSuit ? 'overall' : 'upper',
      isChildGarment
    };
  }

  // 5. Kids / Baby Frocks & Full Sets
  if (isChildGarment) {
    const isBottomOnly = /(?:\b(?:pant|jeans|trouser)\b|প্যান্ট|জিন্স)/i.test(catOnly) && !/(?:\b(?:shirt|top|panjabi|suit|set)\b|শার্ট|পাঞ্জাবি|স্যুট|সেট)/i.test(catOnly);
    return {
      kind: 'baby',
      vtonCategory: isBottomOnly ? 'bottoms' : 'one-pieces',
      leffaCategory: isBottomOnly ? 'lower_body' : 'dresses',
      catvtonCategory: isBottomOnly ? 'lower' : 'overall',
      isChildGarment: true
    };
  }

  // 6. Jeans / Pants / Trousers / Bottoms
  if (
    /(?:\b(?:pant|pants|jeans|denim|trouser|trousers|chino|chinos|cargo|gabardine|jogger|joggers|leggings|palazzo)\b|প্যান্ট|জিন্স|গ্যাবার্ডিন|ট্রাউজার|কার্গো|চিনো|পালাজ্জো)/i.test(
      catOnly
    ) &&
    !/(?:\b(?:shirt|t-?shirt|panjabi|kurta|blazer|top)\b|শার্ট|টি-?শার্ট|পাঞ্জাবি|ব্লেজার)/i.test(catOnly)
  ) {
    return {
      kind: 'pant',
      vtonCategory: 'bottoms',
      leffaCategory: 'lower_body',
      catvtonCategory: 'lower',
      isChildGarment: false
    };
  }

  // 7. Panjabi / Kurta / Kabli
  if (/(?:\b(?:panjabi|punjabi|kurta|kabli)\b|পাঞ্জাবি|পাঞ্জাবী|কুর্তা|কাবলি)/i.test(combined)) {
    const hasPajamaSet = /(?:\b(?:kabli|set|pajama|trouser)\b|কাবলি|পায়জামা)/i.test(catOnly);
    return {
      kind: 'panjabi',
      vtonCategory: hasPajamaSet ? 'one-pieces' : 'tops',
      leffaCategory: hasPajamaSet ? 'dresses' : 'upper_body',
      catvtonCategory: hasPajamaSet ? 'overall' : 'upper',
      isChildGarment
    };
  }

  // 8. Undergarments / Loungewear / Nightwear
  if (/(?:\b(?:undergarment|innerwear|nightwear|loungewear|sleepwear|lingerie|bra|brief|boxer)\b|আন্ডারগার্মেন্ট|নাইটি|ইনারওয়্যার)/i.test(combined)) {
    return {
      kind: 'undergarments',
      vtonCategory: 'one-pieces',
      leffaCategory: 'dresses',
      catvtonCategory: 'overall',
      isChildGarment: false
    };
  }

  // 9. T-Shirt / Henley / Polo (checked BEFORE generic shirt)
  if (/(?:\b(?:t-?shirt|tshirt|tee|henley|polo)\b|টি-?শার্ট|টিশার্ট|গেঞ্জি|পোলো)/i.test(combined)) {
    return {
      kind: 't-shirt',
      vtonCategory: 'tops',
      leffaCategory: 'upper_body',
      catvtonCategory: 'upper',
      isChildGarment
    };
  }

  // 10. Shirt (Formal / Casual / Button-down)
  if (/(?:\b(?:shirt|button-down|oxford|flannel)\b|শার্ট)/i.test(combined)) {
    return {
      kind: 'shirt',
      vtonCategory: 'tops',
      leffaCategory: 'upper_body',
      catvtonCategory: 'upper',
      isChildGarment
    };
  }

  return {
    kind: 'other',
    vtonCategory: 'tops',
    leffaCategory: 'upper_body',
    catvtonCategory: 'upper',
    isChildGarment
  };
}

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
 * Automatically crop out promotional ad banners (left sidebar text on Snehalata/vendor banners)
 * and generate both a clean portrait garment buffer AND a close-up neck-down garment zoom buffer.
 */
export async function prepareCleanGarmentBuffers(opts: {
  productImg: string;
  rawVisionCaption?: string;
  category?: string;
}): Promise<{
  cleanPortraitDataUrl: string;
  cleanZoomDataUrl: string;
  isModelPhoto: boolean;
}> {
  const origBasename = (opts.productImg.split('/').pop() || '').split('?')[0].toLowerCase();
  const effectiveRef = UNOBSTRUCTED_HANGER_TWINS[origBasename] || opts.productImg;
  const basename = (effectiveRef.split('/').pop() || '').split('?')[0].toLowerCase();
  const rawCap = opts.rawVisionCaption || '';
  const catLower = (opts.category || '').toLowerCase();

  let isModelPhoto = !FLAT_LAY_BASENAMES.has(basename);
  if (!CATALOG_VISUAL_DNA[basename] && rawCap) {
    isModelPhoto = /\b(man|woman|person|boy|girl|model|wearing|standing|sitting|smiling)\b/i.test(rawCap);
  }

  try {
    const { buffer } = await resolveImageBuffer(effectiveRef);
    const sharpMod = await import('sharp').catch(() => null);
    if (!sharpMod?.default) {
      const b64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      return { cleanPortraitDataUrl: b64, cleanZoomDataUrl: b64, isModelPhoto };
    }

    const sharp = sharpMod.default;
    const meta = await sharp(buffer).metadata();
    const W = meta.width || 1024;
    const H = meta.height || 1024;

    const hasLeftBanner =
      LEFT_BANNER_BASENAMES.has(basename) ||
      W > H * 1.12 ||
      /\b(right side of the image|left side of the image, there is text|text that reads|neural verified|collection|shop now|vendor|porda|kuthir|craftsmanship)\b/i.test(
        rawCap
      );

    // Automatic Pixel-Level Retail Hang-Tag & Flat-Lay Detector for any future vendor upload
    let autoDetectedFlatLayTag = false;
    if (!isModelPhoto || (!hasLeftBanner && /shirt/i.test(catLower || basename))) {
      try {
        const { data: thumb } = await sharp(buffer)
          .resize(40, 40, { fit: 'fill' })
          .raw()
          .toBuffer({ resolveWithObject: true });
        // Check if top-left & top-right corners are clean studio background (no room/person head)
        const lumAt = (x: number, y: number) => {
          const idx = (y * 40 + x) * 3;
          return 0.299 * thumb[idx] + 0.587 * thumb[idx + 1] + 0.114 * thumb[idx + 2];
        };
        const cornerLum = (lumAt(2, 2) + lumAt(37, 2)) / 2;
        // Compare center chest hang-tag zone (x:18..22, y:14..21) against left/right chest fabric (x:11..15 & x:25..29, y:14..21)
        let centerWhitePixels = 0;
        let centerTotal = 0;
        let sideLumSum = 0;
        let sideTotal = 0;
        for (let y = 14; y <= 21; y++) {
          for (let x = 18; x <= 22; x++) {
            const idx = (y * 40 + x) * 3;
            const r0 = thumb[idx], g0 = thumb[idx + 1], b0 = thumb[idx + 2];
            const l0 = (r0 + g0 + b0) / 3;
            const d0 = Math.max(r0, g0, b0) - Math.min(r0, g0, b0);
            if (l0 > 198 && d0 < 38) centerWhitePixels++;
            centerTotal++;
          }
          for (const x of [11, 12, 13, 14, 25, 26, 27, 28]) {
            sideLumSum += lumAt(x, y);
            sideTotal++;
          }
        }
        const avgSideLum = sideTotal ? sideLumSum / sideTotal : 200;
        if (cornerLum > 175 && centerTotal > 0 && centerWhitePixels / centerTotal >= 0.22 && avgSideLum < 165) {
          autoDetectedFlatLayTag = true;
          isModelPhoto = false;
        }
      } catch {
        // ignore
      }
    }

    // 1. Clean Portrait Buffer (removes left promotional text column, corner badges, wire hangers & retail price tags)
    let portraitBuf = buffer;
    if (/^tshirt-[1234]\.jpg$/i.test(basename)) {
      portraitBuf = await sharp(buffer)
        .extract({
          left: Math.round(W * 0.38),
          top: Math.round(H * 0.06),
          width: Math.round(W * 0.56),
          height: Math.round(H * 0.92)
        })
        .jpeg({ quality: 92 })
        .toBuffer();
    } else if (
      /^shirt-(?:[6789]|1[0123])\.jpg$/i.test(basename) ||
      autoDetectedFlatLayTag ||
      (!isModelPhoto && /\b(hanger|tag|label)\b/i.test(rawCap))
    ) {
      let workBuf = buffer;
      let curW = W;
      let curH = H;

      // shirt-12.jpg is a side-by-side Front (left 50%) + Back (right 50%) image
      if (basename === 'shirt-12.jpg') {
        workBuf = await sharp(workBuf)
          .extract({ left: 0, top: 0, width: Math.round(curW * 0.50), height: curH })
          .toBuffer();
        const m2 = await sharp(workBuf).metadata();
        curW = m2.width || Math.round(W * 0.50);
        curH = m2.height || H;
      }

      // Sample top-left background color
      const { data: bgData } = await sharp(workBuf)
        .extract({ left: 8, top: 8, width: 16, height: 16 })
        .raw()
        .toBuffer({ resolveWithObject: true });
      let r = 0, g = 0, b = 0;
      const n = Math.max(1, bgData.length / 3);
      for (let i = 0; i < bgData.length; i += 3) {
        r += bgData[i];
        g += bgData[i + 1];
        b += bgData[i + 2];
      }
      r = Math.round(r / n);
      g = Math.round(g / n);
      b = Math.round(b / n);

      // Heal center chest retail price hang-tag (x: 42.5%..57.5%, y: 32%..55%) using clean lower placket patch (y: 62%..85%)
      const patchW = Math.round(curW * 0.15);
      const patchH = Math.round(curH * 0.23);
      const patchX = Math.round(curW * 0.425);
      const cleanPlacketPatch = await sharp(workBuf)
        .extract({ left: patchX, top: Math.round(curH * 0.62), width: patchW, height: patchH })
        .toBuffer();

      // Carve clean open V-neck collar opening (removes wire hanger + high back-collar inner band + white inner neck label)
      const pts = [
        `0,0`,
        `${curW},0`,
        `${curW},${Math.round(curH * 0.09)}`,
        `${Math.round(curW * 0.565)},${Math.round(curH * 0.11)}`,
        `${Math.round(curW * 0.545)},${Math.round(curH * 0.23)}`,
        `${Math.round(curW * 0.50)},${Math.round(curH * 0.285)}`,
        `${Math.round(curW * 0.455)},${Math.round(curH * 0.23)}`,
        `${Math.round(curW * 0.435)},${Math.round(curH * 0.11)}`,
        `0,${Math.round(curH * 0.09)}`
      ].join(' ');

      const vNeckSvg = Buffer.from(
        `<svg width="${curW}" height="${curH}" xmlns="http://www.w3.org/2000/svg"><polygon points="${pts}" fill="rgb(${r},${g},${b})" /></svg>`
      );

      portraitBuf = await sharp(workBuf)
        .composite([
          { input: cleanPlacketPatch, left: patchX, top: Math.round(curH * 0.32) },
          { input: vNeckSvg, left: 0, top: 0 }
        ])
        .jpeg({ quality: 92 })
        .toBuffer();
    } else if (hasLeftBanner) {
      const left = Math.round(W * 0.40);
      portraitBuf = await sharp(buffer)
        .extract({ left, top: 0, width: W - left, height: H })
        .jpeg({ quality: 92 })
        .toBuffer();
    }

    // 2. Clean Category-Aware Garment Zoom Buffer (crops out the reference model's face AND ad banner)
    let zoomBuf = portraitBuf;
    const tax = classifyGarmentCategory(opts.category, basename, '', rawCap, effectiveRef);
    if (isModelPhoto) {
      const left = hasLeftBanner ? Math.round(W * 0.43) : Math.round(W * 0.12);
      const width = hasLeftBanner ? Math.round(W * 0.46) : Math.round(W * 0.76);
      // Lower body (Jeans/Pants) zooms into waist-to-ankle; Full ensembles (Saree/Three-Piece/Borka/Kids) keep neck-to-hem; Tops keep neck-to-hip
      const top = tax.kind === 'pant' ? Math.round(H * 0.32) : tax.vtonCategory === 'one-pieces' ? Math.round(H * 0.18) : Math.round(H * 0.22);
      const height = tax.kind === 'pant' ? Math.round(H * 0.65) : tax.vtonCategory === 'one-pieces' ? Math.round(H * 0.80) : Math.round(H * 0.76);
      if (left + width <= W && top + height <= H) {
        zoomBuf = await sharp(buffer)
          .extract({ left, top, width, height })
          .jpeg({ quality: 92 })
          .toBuffer();
      }
    }

    return {
      cleanPortraitDataUrl: `data:image/jpeg;base64,${portraitBuf.toString('base64')}`,
      cleanZoomDataUrl: `data:image/jpeg;base64,${zoomBuf.toString('base64')}`,
      isModelPhoto
    };
  } catch {
    return {
      cleanPortraitDataUrl: opts.productImg,
      cleanZoomDataUrl: opts.productImg,
      isModelPhoto
    };
  }
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
 * Never runs raw pixel-box sampling on model/banner photos (where background rooms/screens would pollute colors).
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
 * For new vendor images that are wide banners, automatically crops off the left ad text first so Florence-2 focuses 100% on the garment!
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
    let { buffer, mimeType, ext } = await resolveImageBuffer(productImgRef);
    // If a new vendor uploaded a wide promotional banner, crop the right 62% so Florence-2 inspects the garment closely
    try {
      const sharpMod = await import('sharp').catch(() => null);
      if (sharpMod?.default) {
        const sharp = sharpMod.default;
        const meta = await sharp(buffer).metadata();
        if (meta.width && meta.height && meta.width > meta.height * 1.15) {
          const left = Math.round(meta.width * 0.38);
          buffer = await sharp(buffer)
            .extract({ left, top: 0, width: meta.width - left, height: meta.height })
            .jpeg({ quality: 90 })
            .toBuffer();
          mimeType = 'image/jpeg';
          ext = 'jpg';
        }
      }
    } catch {
      // keep original buffer
    }

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

    const sentences = rawCaption
      .replace(/hanging on a [a-z\s]*hanger/gi, '')
      .replace(/on a [a-z\s]*hanger/gi, '')
      .split(/\.\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) =>
        s
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
 * Notice: NEVER injects the word "polo" on T-shirts/Henleys so stand-up Chinese band collars stay 100% collarless/unfolded!
 */
function buildExactTryOnPrompt(opts: {
  category: string;
  cleanName: string;
  cleanDesc: string;
  visualStructure: string;
  visionCaption: string;
  isCatalogExactMatch: boolean;
  productImg?: string;
}): string {
  const { category, cleanName, cleanDesc, visualStructure, visionCaption, isCatalogExactMatch, productImg } = opts;
  const tax = classifyGarmentCategory(category, cleanName, cleanDesc, `${visualStructure} ${visionCaption}`, productImg);

  let removalClause =
    "Completely replace the person's current clothing (removing any previous suit jacket, blazer, coat, or top)";
  let fitClause = 'fitted naturally with realistic fabric folds, neckline, sleeves, and studio lighting';

  if (tax.kind === 'saree') {
    removalClause = "Completely replace the person's current outfit with this authentic Bangladeshi Saree ensemble";
    fitClause =
      'draped in traditional Bangladeshi Nivi saree style — faithfully reproducing the exact woven/embroidered anchal (pallu) draped over the left shoulder, the exact par (border) running along the lower hem and front pleats, the exact body fabric motifs, and the matching fitted blouse';
  } else if (tax.kind === 'three-piece') {
    removalClause =
      "Completely replace the person's current outfit with this complete Bangladeshi Three-Piece Salwar Kameez ensemble";
    fitClause =
      'styled as an authentic Bangladeshi three-piece salwar kameez suit — faithfully reproducing the exact embroidered/printed long kameez tunic neckline, sleeves, and daman hem border, the matching salwar/trousers, and the matching dupatta scarf draped gracefully across the chest and shoulder';
  } else if (tax.kind === 'borka') {
    removalClause = "Completely replace the person's current outfit with this modest Abaya Borka ensemble";
    fitClause =
      'styled as a modest full-length flowing luxury Abaya Borka gown with exact front/sleeve beadwork embroidery and matching draped hijab';
  } else if (tax.kind === 'blazer') {
    removalClause = "Dress the person in this tailored formal Blazer / Suit / Waistcoat outerwear ensemble";
    fitClause =
      'tailored sharply over the shoulders and torso with crisp lapels, structured chest, pocket square, button closure, and sleeves matching the exact reference blazer/suit/waistcoat';
  } else if (tax.kind === 'baby') {
    removalClause = "Completely replace the child/model's current outfit";
    fitClause =
      'proportioned naturally and comfortably as a premium kids/children outfit, preserving every exact detail of the party frock/ruffles/bow or kids panjabi/waistcoat/suit set';
  } else if (tax.kind === 'panjabi') {
    fitClause =
      'tailored as a Bangladeshi luxury men Panjabi tunic kurta with exact embroidered mandarin collar, chest button placket, and sleeve cuffs';
  } else if (tax.kind === 'pant') {
    removalClause =
      "Replace ONLY the person's lower-body trousers/pants/jeans while keeping their upper-body top/shirt, face, hands, and background untouched";
    fitClause =
      'tailored naturally from the waistband down the legs with authentic denim/gabardine/cotton fabric wash, pockets, stitching, and ankle hem';
  } else if (tax.kind === 't-shirt') {
    fitClause =
      'worn as a standalone short-sleeve t-shirt on the torso with bare forearms visible (completely remove any suit jacket, blazer, or long-sleeve outer coat)';
  } else if (tax.kind === 'shirt') {
    fitClause =
      'worn as a standalone button-down shirt with visible collar, buttons, full pattern across the chest and sleeves, and cuffs (completely remove any suit jacket, blazer, or outer coat)';
  }

  if (isCatalogExactMatch && visualStructure) {
    return `${removalClause} so they are wearing ONLY this exact garment: ${visualStructure}. Styled ${fitClause}. Keep the person's exact face, facial expression, beard, hairstyle, skin tone, pose, and background 100% identical and unchanged.`;
  }

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
 * True 2-Image Side-by-Side Diptych Garment Transfer via FLUX.1 Kontext Dev.
 * Stitches [Left: Customer Photo (512x768) | Right: Clean Garment Reference (512x768)] into a 1024x768 diptych,
 * instructs FLUX.1 Kontext Dev to dress the left person in the exact garment from the right panel,
 * and crops back the left panel!
 */
export async function tryOnWithKontextDiptych(opts: {
  userImg: string;
  cleanGarmentRef: string;
  garmentDetailsPrompt: string;
}): Promise<string | null> {
  const sharpMod = await import('sharp').catch(() => null);
  if (!sharpMod?.default) return null;
  const sharp = sharpMod.default;

  const [userResolved, garmResolved] = await Promise.all([
    resolveImageBuffer(opts.userImg),
    resolveImageBuffer(opts.cleanGarmentRef)
  ]);

  const panelW = 512;
  const panelH = 768;

  const [leftBuf, rightBuf] = await Promise.all([
    sharp(userResolved.buffer).resize(panelW, panelH, { fit: 'cover', position: 'top' }).toBuffer(),
    sharp(garmResolved.buffer).resize(panelW, panelH, { fit: 'cover', position: 'center' }).toBuffer()
  ]);

  const diptychBuf = await sharp({
    create: { width: panelW * 2, height: panelH, channels: 3, background: { r: 255, g: 255, b: 255 } }
  })
    .composite([
      { input: leftBuf, left: 0, top: 0 },
      { input: rightBuf, left: panelW, top: 0 }
    ])
    .jpeg({ quality: 92 })
    .toBuffer();

  const diptychDataUrl = `data:image/jpeg;base64,${diptychBuf.toString('base64')}`;

  const diptychPrompt = `Two-panel split-screen image: The LEFT panel shows a person; the RIGHT panel shows the reference garment. Keep this exact two-panel split-screen layout with the vertical division in the middle. Modify ONLY the LEFT panel so the person on the left is wearing the EXACT garment shown in the RIGHT panel — copying the exact fabric color, exact collar shape and thin piping line, exact button color, exact chest logo, and exact sleeve trim directly from the right panel (${opts.garmentDetailsPrompt}). Keep the left person's exact face, facial identity, beard, hair, skin tone, and background unchanged.`;

  const editedDataUrl = await editImageWithFluxKontext(diptychDataUrl, diptychPrompt, {
    guidanceScale: 2.5,
    steps: 26,
    seed: 42
  });
  if (!editedDataUrl) return null;

  const { buffer: outBuf } = await resolveImageBuffer(editedDataUrl);
  const outMeta = await sharp(outBuf).metadata();
  const outW = outMeta.width || 1024;
  const outH = outMeta.height || 768;

  // If the output preserved the side-by-side landscape layout, crop the left panel (the dressed person)
  if (outW >= outH * 1.15) {
    const croppedLeft = await sharp(outBuf)
      .extract({ left: 0, top: 0, width: Math.floor(outW * 0.495), height: outH })
      .webp({ quality: 92 })
      .toBuffer();
    return `data:image/webp;base64,${croppedLeft.toString('base64')}`;
  }

  return editedDataUrl;
}

/**
 * True 2-Image Pixel-Exact Virtual Try-On via FASHN VTON 1.5 (fashn-ai-fashn-vton-1-5.hf.space).
 * Takes BOTH person_image AND garment_image directly and warps the exact garment onto the person.
 */
export async function tryOnWithFashnVton(opts: {
  userImg: string;
  productImg: string;
  category?: string;
  productName?: string;
  isModelPhoto?: boolean;
}): Promise<string | null> {
  const tax = classifyGarmentCategory(opts.category, opts.productName, '', '', opts.productImg);
  const vtonCategory = tax.vtonCategory;

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
 * True 2-Image Pixel-Exact Virtual Try-On via LEFFA VTON (franciszzj-leffa.hf.space).
 */
export async function tryOnWithLeffaVton(opts: {
  userImg: string;
  productImg: string;
  category?: string;
  productName?: string;
}): Promise<string | null> {
  const tax = classifyGarmentCategory(opts.category, opts.productName, '', '', opts.productImg);
  const garmentType = tax.leffaCategory;
  const modelType: 'viton_hd' | 'dress_code' = garmentType === 'upper_body' ? 'viton_hd' : 'dress_code';

  const uploadOne = async (ref: string, label: string) => {
    const { buffer, mimeType, ext } = await resolveImageBuffer(ref);
    const form = new FormData();
    form.append('files', new Blob([new Uint8Array(buffer)], { type: mimeType }), `${label}.${ext}`);
    const r = await fetch(`${LEFFA_VTON_SPACE}/gradio_api/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) throw new Error(`LEFFA upload failed (${r.status})`);
    const j = await r.json();
    return Array.isArray(j) ? j[0] : null;
  };

  const [pPath, gPath] = await Promise.all([
    uploadOne(opts.userImg, 'person'),
    uploadOne(opts.productImg, 'garment')
  ]);
  if (!pPath || !gPath) return null;

  const callResp = await fetch(`${LEFFA_VTON_SPACE}/gradio_api/call/leffa_predict_vt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [
        { path: pPath, meta: { _type: 'gradio.FileData' } },
        { path: gPath, meta: { _type: 'gradio.FileData' } },
        true,
        24,
        2.5,
        42,
        modelType,
        garmentType,
        false
      ]
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!callResp.ok) return null;
  const { event_id } = await callResp.json();
  if (!event_id) return null;

  const sseResp = await fetch(`${LEFFA_VTON_SPACE}/gradio_api/call/leffa_predict_vt/${event_id}`, {
    signal: AbortSignal.timeout(35000)
  });
  if (!sseResp.ok) return null;
  return await readGradioSseAndFetchDataUrl(LEFFA_VTON_SPACE, sseResp);
}

/**
 * True 2-Image Pixel-Exact Virtual Try-On via CatVTON-Flux (multimodalart-catvton-zerogpu.hf.space).
 */
export async function tryOnWithCatVtonFlux(opts: {
  userImg: string;
  productImg: string;
  category?: string;
  productName?: string;
}): Promise<string | null> {
  const tax = classifyGarmentCategory(opts.category, opts.productName, '', '', opts.productImg);
  const clothType = tax.catvtonCategory;

  const uploadOne = async (ref: string, label: string) => {
    const { buffer, mimeType, ext } = await resolveImageBuffer(ref);
    const form = new FormData();
    form.append('files', new Blob([new Uint8Array(buffer)], { type: mimeType }), `${label}.${ext}`);
    const r = await fetch(`${CATVTON_SPACE}/gradio_api/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) throw new Error(`CatVTON upload failed (${r.status})`);
    const j = await r.json();
    return Array.isArray(j) ? j[0] : null;
  };

  const [pPath, gPath] = await Promise.all([
    uploadOne(opts.userImg, 'person'),
    uploadOne(opts.productImg, 'garment')
  ]);
  if (!pPath || !gPath) return null;

  const callResp = await fetch(`${CATVTON_SPACE}/gradio_api/call/submit_function_flux`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [
        {
          background: { path: pPath, meta: { _type: 'gradio.FileData' } },
          layers: [],
          composite: null
        },
        { path: gPath, meta: { _type: 'gradio.FileData' } },
        clothType,
        28,
        25,
        42,
        'result only'
      ]
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!callResp.ok) return null;
  const { event_id } = await callResp.json();
  if (!event_id) return null;

  const sseResp = await fetch(`${CATVTON_SPACE}/gradio_api/call/submit_function_flux/${event_id}`, {
    signal: AbortSignal.timeout(35000)
  });
  if (!sseResp.ok) return null;
  return await readGradioSseAndFetchDataUrl(CATVTON_SPACE, sseResp);
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
 * Virtual Garment Try-On powered by True 2-Image Garment Transfer + Vision-Grounded FLUX.1 Kontext Dev.
 */
export async function tryOnGarmentFree(opts: {
  userImg: string;
  productImg: string;
  category?: string;
  productName?: string;
  productDescription?: string;
  colorHint?: string;
  preferEngine?: 'diptych' | 'fashn' | 'qwen' | 'kontext';
}): Promise<string | null> {
  const [visionData, cleanName, cleanDesc] = await Promise.all([
    describeGarmentImageVisually(opts.productImg),
    translateAndEnhancePrompt((opts.productName || opts.category || 'Traditional Garment').trim()),
    opts.productDescription ? translateAndEnhancePrompt(opts.productDescription.slice(0, 140)) : Promise.resolve('')
  ]);

  const [visualStructure, cleanGarments] = await Promise.all([
    analyzeGarmentVisualStructure(opts.productImg, visionData.rawCaption, cleanName),
    prepareCleanGarmentBuffers({
      productImg: opts.productImg,
      rawVisionCaption: visionData.rawCaption,
      category: opts.category
    })
  ]);

  const cat = (opts.category || 'Traditional Garment').trim();
  const prompt = buildExactTryOnPrompt({
    category: cat,
    cleanName,
    cleanDesc,
    visualStructure,
    visionCaption: visionData.cleanGarmentCaption,
    isCatalogExactMatch: visionData.isCatalogExactMatch,
    productImg: opts.productImg
  });

  const garmentDetailsSummary =
    visualStructure || visionData.cleanGarmentCaption || `${cleanName} (${cat})`;

  // Allow targeted benchmarking of any specific 2-image engine
  if (opts.preferEngine === 'fashn') {
    return await tryOnWithFashnVton({
      userImg: opts.userImg,
      productImg: cleanGarments.cleanPortraitDataUrl,
      category: cat,
      productName: cleanName,
      isModelPhoto: cleanGarments.isModelPhoto
    });
  }
  if (opts.preferEngine === 'qwen') {
    return await tryOnWithQwenMultiImage(opts.userImg, cleanGarments.cleanPortraitDataUrl, prompt);
  }
  if (opts.preferEngine === 'diptych') {
    return await tryOnWithKontextDiptych({
      userImg: opts.userImg,
      cleanGarmentRef: cleanGarments.cleanZoomDataUrl,
      garmentDetailsPrompt: garmentDetailsSummary
    });
  }
  if (opts.preferEngine === 'kontext') {
    return await editImageWithFluxKontext(opts.userImg, prompt, {
      guidanceScale: 2.5,
      steps: 26
    });
  }

  // Default Multi-Lane Execution:
  // Lane 1: True 2-Image FASHN VTON 1.5 with banner-cropped clean garment reference
  try {
    const vtonOut = await tryOnWithFashnVton({
      userImg: opts.userImg,
      productImg: cleanGarments.cleanPortraitDataUrl,
      category: cat,
      productName: cleanName,
      isModelPhoto: cleanGarments.isModelPhoto
    });
    if (vtonOut) return vtonOut;
  } catch (e: any) {
    console.warn('[tryOnGarmentFree] FASHN VTON lane error:', e?.message);
  }

  // Lane 2: True 2-Image LEFFA Virtual Try-On (franciszzj-leffa.hf.space)
  try {
    const leffaOut = await tryOnWithLeffaVton({
      userImg: opts.userImg,
      productImg: cleanGarments.cleanPortraitDataUrl,
      category: cat,
      productName: cleanName
    });
    if (leffaOut) return leffaOut;
  } catch (e: any) {
    console.warn('[tryOnGarmentFree] LEFFA VTON lane error:', e?.message);
  }

  // Lane 3: True 2-Image CatVTON-Flux (multimodalart-catvton-zerogpu.hf.space)
  try {
    const catOut = await tryOnWithCatVtonFlux({
      userImg: opts.userImg,
      productImg: cleanGarments.cleanPortraitDataUrl,
      category: cat,
      productName: cleanName
    });
    if (catOut) return catOut;
  } catch (e: any) {
    console.warn('[tryOnGarmentFree] CatVTON-Flux lane error:', e?.message);
  }

  // Lane 4: True 2-Image Qwen-Image-Edit-2511 with [userImg, cleanPortraitDataUrl]
  try {
    const qwenOut = await tryOnWithQwenMultiImage(opts.userImg, cleanGarments.cleanPortraitDataUrl, prompt);
    if (qwenOut) return qwenOut;
  } catch (e: any) {
    console.warn('[tryOnGarmentFree] Qwen multi-image lane error:', e?.message);
  }

  // Lane 5: FLUX.1 Kontext Dev with exact visual DNA / cleaned Florence-2 garment vision
  try {
    const kontextOut = await editImageWithFluxKontext(opts.userImg, prompt, {
      guidanceScale: 2.5,
      steps: 26
    });
    if (kontextOut) return kontextOut;
  } catch (e: any) {
    console.warn('[tryOnGarmentFree] Kontext lane error:', e?.message);
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
