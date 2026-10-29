/**
 * Kecilkan & kompres gambar di browser sebelum disimpan/dikirim.
 * Hemat kuota, muat cepat di HP, dan aman untuk batas body serverless.
 */
export async function fileToDataUrl(
  file: File,
  maxDim = 1280,
  quality = 0.85
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Hanya file gambar yang didukung.");
  }

  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Gagal membaca gambar."));
      el.src = bitmapUrl;
    });

    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak didukung browser ini.");
    ctx.drawImage(img, 0, 0, w, h);

    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

/** Pecah data URL menjadi mime + base64 murni untuk dikirim ke API. */
export function splitDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}
