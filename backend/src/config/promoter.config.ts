import { registerAs } from '@nestjs/config';

/**
 * Promoter (artist referral) programme config.
 *
 * inviteKey gates POST /promoter/signup — the page/URL is unlisted and the
 * key is shared privately with NDA'd artists. Leave the env var unset to
 * hard-disable promoter signup entirely.
 */
export default registerAs('promoter', () => ({
  inviteKey: process.env.PROMOTER_INVITE_KEY || null,
  /** Frontend origin used to build shareable referral URLs. */
  appBaseUrl: process.env.PROMOTER_APP_BASE_URL || 'http://localhost:5173',
}));
