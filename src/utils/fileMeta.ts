/**
 * Derive real file details (byte size + type) from a base64 data URL.
 *
 * The identity-capture flows store images as inline base64 (selfie from
 * the camera canvas, NRC photo from the file picker) rather than a
 * network upload, so there's no File object to read later. These helpers
 * recover the size + type straight from the data URL so the upload tiles
 * can show "JPEG · 1.2 MB" as proof the right file was received — one of
 * the core "rich file details" UX principles.
 */

export interface DataUrlMeta {
  bytes: number;
  /** Upper-cased subtype, e.g. "JPEG", "PNG" — falls back to "IMAGE". */
  label: string;
}

export function dataUrlMeta(dataUrl?: string): DataUrlMeta | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return null;

  const header = dataUrl.slice(5, comma); // e.g. "image/jpeg;base64"
  const mime = header.split(';')[0] || '';
  const subtype = mime.split('/')[1]?.toUpperCase() || 'IMAGE';

  const b64 = dataUrl.slice(comma + 1);
  // base64 encodes 3 bytes per 4 chars; subtract padding to get the real size.
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  const bytes = Math.max(0, Math.floor((b64.length * 3) / 4) - padding);

  return { bytes, label: subtype };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
