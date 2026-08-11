/**
 * The object-storage boundary.
 *
 * Uploads used to be `fs.writeFileSync` calls scattered across four services.
 * That works only where a persistent volume exists (Render), and silently
 * destroys every file on platforms without one (DO App Platform). Everything
 * that stores or reads an upload now goes through this interface, so the
 * backend is chosen by one env var rather than a rewrite — the same shape as
 * the `PaymentProvider` switch in the payments module.
 *
 * TWO CLASSES OF OBJECT, and the distinction is a security boundary:
 *
 *   PUBLIC — product images, ad creatives, ticket posters. World-readable,
 *            served directly (static dir, or the bucket's CDN).
 *   SECURE — KYC documents, payslips, bank statements, loan T&Cs. AES-256-GCM
 *            encrypted by the caller BEFORE it reaches a driver, never
 *            world-readable, and only ever read back through the authenticated
 *            `GET /files/secure/:filename` endpoint.
 *
 * A driver that makes secure objects publicly reachable is broken, however
 * convenient. Implementations must keep the two prefixes separate and must not
 * grant public-read on the secure one.
 */

/** Which class of object an operation refers to. */
export type StorageClass = 'public' | 'secure';

export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');

export interface StorageDriver {
  readonly name: string;

  /**
   * Store bytes under `key` and return the URL to persist in the database.
   *
   * For 'public' that is a directly-fetchable URL (`/uploads/x.jpg` on the
   * filesystem driver, an absolute CDN URL on Spaces). For 'secure' it is
   * ALWAYS the app-relative `/files/secure/<key>` path regardless of driver —
   * the bytes are private and must be fetched through the authenticated
   * endpoint, so the stored URL shape stays identical across drivers and
   * existing database rows keep resolving.
   */
  put(
    key: string,
    body: Buffer,
    opts: { storageClass: StorageClass; contentType?: string },
  ): Promise<string>;

  /** Read bytes back. Throws NotFound if the object is missing. */
  get(key: string, storageClass: StorageClass): Promise<Buffer>;

  /** Best-effort delete. A missing object is not an error. */
  delete(key: string, storageClass: StorageClass): Promise<void>;

  /**
   * Every key currently stored in a class. Used by the orphan sweeps, which
   * previously read a directory listing — there is no directory to read in
   * object storage, so this abstracts "what exists" over both backends.
   */
  list(storageClass: StorageClass): Promise<string[]>;

  /** Whether an object exists, without transferring it. */
  exists(key: string, storageClass: StorageClass): Promise<boolean>;
}

/**
 * The single place that turns a stored URL back into a storage key.
 *
 * Stored values are heterogeneous by history and by driver:
 *   `/uploads/a.jpg`                        filesystem public
 *   `https://cdn…/uploads/a.jpg`            Spaces public
 *   `/files/secure/b.pdf`                   secure, either driver
 *   `/api/uploads/a.jpg`                    proxied through nginx
 *   `a.jpg`                                 bare filename
 *   `C:\…\uploads\inquiries\c.jpg`          legacy absolute path (see
 *                                           InquiryImagesService)
 *
 * All of them reduce to the trailing path after the prefix. Taking the basename
 * alone would collapse nested keys such as `inquiries/c.jpg`, so nested
 * segments under a known prefix are preserved.
 */
export function storageKeyFromUrl(value: string): string {
  if (!value) return '';
  let s = String(value).trim().replace(/\\/g, '/');

  // Drop scheme+host if absolute.
  const schemeAt = s.indexOf('://');
  if (schemeAt !== -1) {
    const slash = s.indexOf('/', schemeAt + 3);
    s = slash === -1 ? '' : s.slice(slash);
  }
  s = s.split('?')[0].split('#')[0];

  // Keep everything after the LAST occurrence of a known prefix, so both
  // `/uploads/x` and `/var/data/uploads/x` yield `x`.
  for (const prefix of ['/files/secure/', '/uploads/', '/secure-uploads/']) {
    const at = s.lastIndexOf(prefix);
    if (at !== -1) return s.slice(at + prefix.length).replace(/^\/+/, '');
  }

  // No recognisable prefix — treat the trailing segment as the key.
  return s.replace(/^\/+/, '');
}

/**
 * Reject anything that could escape its prefix. Keys are generated server-side,
 * but they also arrive from URL parameters on the secure-serve endpoint, so
 * this is a real boundary and not a formality.
 */
export function assertSafeStorageKey(key: string): void {
  if (
    !key ||
    key.includes('..') ||
    key.startsWith('/') ||
    key.includes('\\') ||
    /^[a-zA-Z]:/.test(key)
  ) {
    throw new Error(`Unsafe storage key: ${key}`);
  }
}
