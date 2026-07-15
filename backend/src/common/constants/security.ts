/**
 * bcrypt salt rounds for passwords and PINs. 12 is OWASP's current
 * baseline (was 10) — existing hashes keep verifying fine since bcrypt
 * embeds its own cost factor in the hash string, so raising this doesn't
 * need a migration; only newly-hashed values use the higher cost.
 */
export const BCRYPT_SALT_ROUNDS = 12;
