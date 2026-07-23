import * as path from 'path';

/**
 * Where uploaded files live on disk.
 *
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
 * Deliberately a plain module rather than a `registerAs` config: these paths are
 * needed at bootstrap in main.ts (static serving) as well as inside DI-managed
 * services, and a single source of truth beats wiring the same values twice.
 */

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
