import * as path from 'path';

/**
 * Where uploaded files live.
 *
 * TWO BACKENDS, chosen by `STORAGE_DRIVER`:
 *
 *   'filesystem' (default) — a mounted persistent volume. What Render runs.
 *   'spaces'               — S3-compatible object storage (DigitalOcean
 *                            Spaces). Required on any platform WITHOUT
 *                            persistent volumes, such as DO App Platform.
 *
 * Filesystem stays the default on purpose: the existing Render deploy must keep
 * behaving byte-for-byte as before, so object storage is strictly additive.
 *
 * ── filesystem ──
 * Container filesystems are ephemeral: without a mounted volume every upload is
 * destroyed on redeploy/restart. Both directories below must therefore sit on
 * the SAME persistent volume in production — Render allows exactly one disk per
 * service, so mounting only the public uploads path still silently loses every
 * encrypted KYC document (payslips, bank statements, title deeds). Point both
 * env vars at paths under a single mount, e.g.
 *
 *   disk.mountPath      = /var/data
 *   UPLOADS_DIR         = /var/data/uploads
 *   SECURE_UPLOADS_DIR  = /var/data/secure-uploads
 *
 * Left unset, both fall back to the historical in-container paths so local dev
 * and any existing deploy keep behaving exactly as before.
 *
 * ── spaces ──
 * Public objects are served straight from the bucket's CDN; SENSITIVE objects
 * are stored PRIVATE and still streamed through the authenticated
 * `GET /files/secure/:filename` endpoint, so the auth model and the stored URL
 * shape are identical to the filesystem driver. Never make the secure prefix
 * public-read: that would expose KYC documents to anyone with the URL.
 *
 * Deliberately a plain module rather than a `registerAs` config: these values
 * are needed at bootstrap in main.ts (static serving) as well as inside
 * DI-managed services, and a single source of truth beats wiring them twice.
 */

export type StorageDriverName = 'filesystem' | 'spaces';

/** Which backend is active. Anything other than 'spaces' means filesystem. */
export function getStorageDriverName(): StorageDriverName {
  return process.env.STORAGE_DRIVER === 'spaces' ? 'spaces' : 'filesystem';
}

/** True when uploads live on a local/mounted disk (and `/uploads` is served by us). */
export function isFilesystemStorage(): boolean {
  return getStorageDriverName() === 'filesystem';
}

export interface SpacesConfig {
  /** e.g. fra1 */
  region: string;
  /** e.g. https://fra1.digitaloceanspaces.com */
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /**
   * Public base URL for world-readable objects — the CDN edge if enabled,
   * otherwise the origin. Used to build the URLs we store in the database.
   */
  publicBaseUrl: string;
  /** Key prefixes. Kept distinct so a bucket policy can target them separately. */
  publicPrefix: string;
  securePrefix: string;
}

export function getSpacesConfig(): SpacesConfig {
  const region = process.env.SPACES_REGION || 'fra1';
  const endpoint = process.env.SPACES_ENDPOINT || `https://${region}.digitaloceanspaces.com`;
  const bucket = process.env.SPACES_BUCKET || '';
  return {
    region,
    endpoint,
    bucket,
    accessKeyId: process.env.SPACES_KEY || '',
    secretAccessKey: process.env.SPACES_SECRET || '',
    // Default to the non-CDN origin: it always works. Set SPACES_PUBLIC_BASE_URL
    // to the CDN hostname to serve public images from the edge instead.
    publicBaseUrl:
      process.env.SPACES_PUBLIC_BASE_URL || (bucket ? `${endpoint}/${bucket}` : ''),
    publicPrefix: process.env.SPACES_PUBLIC_PREFIX || 'uploads',
    securePrefix: process.env.SPACES_SECURE_PREFIX || 'secure-uploads',
  };
}

/**
 * Scream at boot when a production deploy is about to lose every upload.
 *
 * The dangerous combination: NODE_ENV=production + filesystem driver + no
 * UPLOADS_DIR override. That means uploads go to the in-container default
 * path, and container filesystems are wiped on every redeploy/restart — the
 * exact silent-loss mode that once destroyed uploads on DO App Platform
 * before the Spaces driver was configured. Deliberately a WARNING, not a
 * hard fail: a mis-set flag must never take a running marketplace down, but
 * it must be impossible to miss in the logs.
 */
export function warnIfEphemeralProductionStorage(logError: (msg: string) => void): void {
  if (
    process.env.NODE_ENV === 'production' &&
    isFilesystemStorage() &&
    !process.env.UPLOADS_DIR
  ) {
    logError(
      'STORAGE MISCONFIGURED: NODE_ENV=production with STORAGE_DRIVER=filesystem and no ' +
        'UPLOADS_DIR. Uploads are being written to the EPHEMERAL container disk and WILL BE ' +
        'DESTROYED on the next redeploy/restart. Set STORAGE_DRIVER=spaces (+ SPACES_* vars) ' +
        'on platforms without persistent volumes, or mount a disk and point UPLOADS_DIR / ' +
        'SECURE_UPLOADS_DIR at it.',
    );
  }
}

/** World-readable uploads, served statically from `/uploads`. */
export function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads');
}

/**
 * Encrypted, sensitive uploads. NEVER served statically — only the
 * authenticated `GET /files/secure/:filename` endpoint reads this directory.
 */
export function getSecureUploadsDir(): string {
  return process.env.SECURE_UPLOADS_DIR || path.join(process.cwd(), 'secure-uploads');
}
