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
  logging: process.env.DB_LOGGING === 'true',
  // rejectUnauthorized: true — a managed production Postgres has a
  // CA-signed cert; `false` would accept ANY certificate, permitting a
  // MITM on the database connection.
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: true }
      : false,
}));
