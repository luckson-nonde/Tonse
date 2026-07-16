import { registerAs } from '@nestjs/config';

// A hardcoded fallback here would mean a missing DB_PASSWORD silently
// connects with a guessable default instead of failing loudly.
function requireDbPassword(): string {
  const value = process.env.DB_PASSWORD;
  if (!value) {
    throw new Error('DB_PASSWORD is required — set it in .env');
  }
  return value;
}

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'tonse_user',
  password: requireDbPassword(),
  name: process.env.DB_NAME || 'tonse_db',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  // Auto-apply pending migrations on app boot. This is the production path:
  // set DB_RUN_MIGRATIONS=true + DB_SYNCHRONIZE=false so a deploy migrates the
  // schema deterministically. NEVER enable this together with synchronize.
  runMigrations: process.env.DB_RUN_MIGRATIONS === 'true',
  logging: process.env.DB_LOGGING === 'true',
  // DB_SSL controls TLS to Postgres:
  //   'true'      → verified TLS (CA-signed cert; the secure default in prod)
  //   'no-verify' → TLS without cert verification (Render's managed Postgres
  //                 over its *internal* hostname presents a cert whose CN does
  //                 not match — use this if a verified connection errors)
  //   'false'     → no TLS (local dev / trusted private network)
  // Unset → verified TLS in production, none in dev. Prefer a verified
  // ('true') external connection; only drop to 'no-verify' if Render refuses it.
  ssl: (() => {
    switch (process.env.DB_SSL) {
      case 'true':
        return { rejectUnauthorized: true };
      case 'no-verify':
        return { rejectUnauthorized: false };
      case 'false':
        return false;
      default:
        return process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: true }
          : false;
    }
  })(),
}));
