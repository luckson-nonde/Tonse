/**
 * Client-side image compression for form uploads (prescription photos,
 * reference photos, site photos). Downscales to a sane display resolution and
 * re-encodes as JPEG so raw 12-megapixel phone captures never reach the
 * backend at full size — the storage/DB-bloat guard the Clinical Services
 * spec requires, applied to every image_upload field.
 *
 * Product intent (Clinical Services): the compressed image is stored as a
 * FILE ONLY — proof of need the provider reads with their own eyes. There is
 * deliberately NO OCR / text extraction anywhere in this pipeline.
 */

export interface CompressImageOptions {
  /** Longest edge after downscale. 1600px keeps prescriptions readable in the
   *  provider's full-screen lightbox while cutting multi-MB captures ~10x. */
  maxDim?: number;
  /** JPEG quality. 0.72 is visually clean for documents and photos. */
  quality?: number;
  mime?: string;
}

export async function compressImage(
  file: File,
  { maxDim = 1600, quality = 0.72, mime = 'image/jpeg' }: CompressImageOptions = {},
): Promise<File> {
  // Non-images (or SVGs, which canvas rasterization could mangle) pass through.
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    // White backing so transparent PNG screenshots don't turn black in JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mime, quality),
    );
    // Only swap in the re-encode when it actually saved bytes — tiny or
    // already-optimised files keep their original encoding.
    if (!blob || blob.size >= file.size) return file;

    const stem = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${stem}.jpg`, { type: mime, lastModified: Date.now() });
  } catch {
    // Compression is an optimisation, never a gate — on any failure the
    // original file uploads as-is.
    return file;
  }
}

export default compressImage;
