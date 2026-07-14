/**
 * One-time generated password for owner-created accounts (provider staff,
 * admin User Managers). 12 chars from an alphabet with the ambiguous
 * glyphs removed (no O/0, l/1) — these get read aloud or retyped from a
 * copy panel. The account is created with mustChangePassword=true, so the
 * generated value only ever survives until first login.
 */
export function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 12; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}
