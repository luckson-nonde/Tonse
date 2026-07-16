import * as crypto from 'crypto';

/**
 * Application-level encryption for sensitive PII AT REST (defence-in-depth on
 * top of transport TLS + encrypted storage volumes).
 *
 * AES-256-GCM (authenticated encryption) with a random 96-bit IV per value.
 * Ciphertext is self-describing: `enc:v1:<iv_b64>:<tag_b64>:<ciphertext_b64>`,
 * so we can tell encrypted from legacy plaintext and migrate lazily (a value
 * written before encryption was enabled decrypts to itself — pass-through).
 *
 * KEY MANAGEMENT: the master key comes from `PII_ENCRYPTION_KEY` (base64 of 32
 * random bytes, or any strong string we SHA-256 into a key). In production the
 * key MUST be set and should come from a secrets manager / KMS and be rotated;
 * we fail closed if it's missing. In dev we derive a loud, insecure fallback.
 *
 * Use ONLY for fields that are stored/displayed, never for search keys — GCM's
 * random IV makes ciphertext non-deterministic, so equality lookups / UNIQUE
 * indexes won't work on encrypted columns (use a blind index for those).
 */
const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.PII_ENCRYPTION_KEY || '';
  if (raw) {
    let key: Buffer;
    const asB64 = Buffer.from(raw, 'base64');
    key = asB64.length === 32 ? asB64 : crypto.createHash('sha256').update(raw).digest();
    cachedKey = key;
    return key;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'PII_ENCRYPTION_KEY is not set — refusing to start without an at-rest encryption key.',
    );
  }
  // eslint-disable-next-line no-console
  console.warn(
    '[pii-crypto] PII_ENCRYPTION_KEY not set — using an INSECURE dev key. Set a real key in production.',
  );
  cachedKey = crypto.createHash('sha256').update('tonse-dev-insecure-key-do-not-use-in-prod').digest();
  return cachedKey;
}

/** Encrypt a string for storage. Idempotent: already-encrypted / empty / null pass through. */
export function encryptPii(plain: string | null | undefined): string | null {
  if (plain == null) return plain as null;
  const s = String(plain);
  if (s === '' || s.startsWith(PREFIX)) return s;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(s, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

/** Decrypt a stored string. Legacy plaintext (no prefix) passes through unchanged. */
export function decryptPii(value: string | null | undefined): string | null {
  if (value == null) return value as null;
  const s = String(value);
  if (!s.startsWith(PREFIX)) return s;
  try {
    const [ivB64, tagB64, ctB64] = s.slice(PREFIX.length).split(':');
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    // Wrong key / corrupt payload — return as-is rather than crash a read.
    return s;
  }
}

/** Encrypt raw bytes (for files). Returns a self-describing buffer. */
export function encryptBuffer(buf: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(buf), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Layout: magic(4) | iv(12) | tag(16) | ciphertext
  return Buffer.concat([Buffer.from('ENC1'), iv, tag, ct]);
}

/** Decrypt a buffer produced by encryptBuffer. Returns the input if not our format. */
export function decryptBuffer(buf: Buffer): Buffer {
  if (buf.length < 32 || buf.subarray(0, 4).toString() !== 'ENC1') return buf;
  const iv = buf.subarray(4, 16);
  const tag = buf.subarray(16, 32);
  const ct = buf.subarray(32);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

/**
 * TypeORM column transformer — transparently encrypts on write, decrypts on
 * read. Attach to sensitive, non-searchable columns (must be `text`-typed so
 * the ciphertext fits).
 */
export const piiTransformer = {
  to: (v: string | null | undefined) => encryptPii(v),
  from: (v: string | null | undefined) => decryptPii(v),
};
