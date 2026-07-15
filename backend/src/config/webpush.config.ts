import { registerAs } from '@nestjs/config';

/**
 * Web Push (VAPID) config for background OS notifications.
 *
 * Generate a key pair once with `npx web-push generate-vapid-keys` and put the
 * public/private keys here; the SAME public key must also be exposed to the
 * frontend as VITE_VAPID_PUBLIC_KEY. Leave the keys unset to hard-disable Web
 * Push — PushService detects missing config and no-ops.
 *
 * NOTE (dotenv `#` gotcha): keep these values UNQUOTED and with no trailing
 * `# comment` — VAPID keys are base64url so they won't contain `#`, but a
 * pasted trailing comment would truncate the value.
 */
export default registerAs('webpush', () => ({
  publicKey: process.env.WEB_PUSH_PUBLIC_KEY || null,
  privateKey: process.env.WEB_PUSH_PRIVATE_KEY || null,
  subject: process.env.WEB_PUSH_SUBJECT || 'mailto:ops@tonsehub.com',
}));
