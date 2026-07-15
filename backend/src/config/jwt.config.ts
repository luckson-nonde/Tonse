import { registerAs } from '@nestjs/config';

// A hardcoded fallback here would mean every clone of this repo can forge a
// valid token (any role, including ADMIN) the moment an env var goes
// missing. Fail loudly at boot instead — a placeholder-looking secret is
// exactly as dangerous as a missing one, since it's sitting in every
// checkout of this codebase or its .env.example.
const PLACEHOLDER_PATTERN = /your_|change_me|changeme|example|placeholder|secret_key_here/i;

function requireSecret(envVar: string): string {
  const value = process.env[envVar];
  if (!value || value.length < 32) {
    throw new Error(
      `${envVar} is missing or too short (need >=32 chars). Generate one with: openssl rand -base64 48`,
    );
  }
  if (PLACEHOLDER_PATTERN.test(value)) {
    throw new Error(
      `${envVar} still holds a placeholder value — generate a real secret with: openssl rand -base64 48`,
    );
  }
  return value;
}

export default registerAs('jwt', () => ({
  secret: requireSecret('JWT_SECRET'),
  expiresIn: process.env.JWT_EXPIRATION || '3600s',
  refreshSecret: requireSecret('JWT_REFRESH_SECRET'),
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '604800s',
}));
