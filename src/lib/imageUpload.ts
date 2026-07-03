// Read a File and return a downscaled JPEG data URL.
//
// Why: phone-camera photos are 8-15 MB. Base64-encoding one and POSTing it to a
// Vercel serverless function blows past the ~4.5 MB request-body limit, so the AI
// upload silently fails ON MOBILE ONLY (desktop test images are small). Downscaling
// to ~1280px + JPEG q0.82 keeps every upload well under the limit and speeds up the
// Gemini vision calls. Falls back to the raw data URL if canvas processing fails.
export async function fileToCompressedDataURL(
  file: File,
  maxDim = 1280,
  quality = 0.82
): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = rawDataUrl;
    });

    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;
    if (!width || !height) return rawDataUrl;

    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return rawDataUrl;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return rawDataUrl;
  }
}
