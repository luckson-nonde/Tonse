/**
 * Admin seed
 * ------------
 * Creates the platform's root admin user. Idempotent: safe to re-run.
 *
 * Credentials come from environment variables (backend/.env, gitignored):
 *   ADMIN_EMAIL      required
 *   ADMIN_PASSWORD   required, min 8 chars — never committed, never logged
 *   ADMIN_NAME       optional (default "ProQuote Admin")
 *   ADMIN_PHONE      optional
 *   ADMIN_NRC        optional placeholder NRC
 *
 * Run via:
 *   cd backend && npm run seed
 *
 * Re-running against an existing admin only repairs role/active/verified
 * flags — it does NOT touch the password. To rotate the password to the
 * current ADMIN_PASSWORD value:
 *   npm run seed -- --reset-password
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../app.module';
import { UsersService } from '../../modules/users/users.service';
import { BCRYPT_SALT_ROUNDS } from '../../common/constants/security';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const ADMIN_NAME = process.env.ADMIN_NAME ?? 'ProQuote Admin';
const ADMIN_PHONE = process.env.ADMIN_PHONE ?? '+260970000000';
// Fake-but-unique NRC so the three-tier identity uniqueness checks pass.
// Real NRCs use the format `123456/78/9`; this placeholder is intentionally
// non-conflicting with any real Zambian NRC.
const ADMIN_NRC = process.env.ADMIN_NRC ?? '999999/99/9';

const RESET_PASSWORD = process.argv.includes('--reset-password');

function requireCredentials() {
  const problems: string[] = [];
  if (!ADMIN_EMAIL) problems.push('ADMIN_EMAIL is not set');
  if (!ADMIN_PASSWORD) problems.push('ADMIN_PASSWORD is not set');
  else if (ADMIN_PASSWORD.length < 8) problems.push('ADMIN_PASSWORD must be at least 8 characters');

  if (problems.length > 0) {
    console.error('❌ Cannot seed admin user:');
    for (const p of problems) console.error(`   - ${p}`);
    console.error('\nAdd the values to backend/.env (see .env.example) and re-run.');
    process.exit(1);
  }
}

async function bootstrap() {
  requireCredentials();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const usersService = app.get(UsersService);

    const existing = await usersService.findByEmail(ADMIN_EMAIL).catch(() => null);
    if (existing) {
      // Idempotent path: ensure the existing record is in admin shape.
      const updates: Record<string, any> = {};
      if (existing.role !== 'ADMIN') updates.role = 'ADMIN';
      if (!existing.isActive) updates.isActive = true;
      if (existing.verificationStatus !== 'VERIFIED') updates.verificationStatus = 'VERIFIED';
      if (RESET_PASSWORD) updates.password = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_SALT_ROUNDS);

      if (Object.keys(updates).length > 0) {
        await usersService.update(existing.id, updates as any);
        console.log(`✅ Existing user '${ADMIN_EMAIL}' updated${RESET_PASSWORD ? ' (password rotated)' : ''}.`);
      } else {
        console.log(`ℹ️  Admin user '${ADMIN_EMAIL}' already exists — nothing to do.`);
      }
      console.log(`\nAdmin login credentials:`);
      console.log(`  Email:    ${ADMIN_EMAIL}`);
      console.log(
        RESET_PASSWORD
          ? `  Password: (the current ADMIN_PASSWORD value in backend/.env)`
          : `  Password: (unchanged — re-run with --reset-password to rotate it)`
      );
      console.log(`  Role:     ADMIN`);
      return;
    }

    // Fresh registration: hash password and use the existing register flow so
    // the UserEmail row + displayId + audit trail get created consistently.
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_SALT_ROUNDS);

    const user = await usersService.register(
      ADMIN_NRC,
      ADMIN_NAME,
      ADMIN_EMAIL,
      ADMIN_PHONE,
      passwordHash,
      'ADMIN'
    );

    // register() writes verificationStatus=PENDING; bump to VERIFIED so the
    // login flow doesn't friction-block the admin.
    await usersService.update(user.id, {
      verificationStatus: 'VERIFIED',
      isActive: true,
    } as any);

    console.log('\n✅ Admin user created.\n');
    console.log('Admin login credentials');
    console.log('-----------------------');
    console.log(`  Name:     ${ADMIN_NAME}`);
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: (the ADMIN_PASSWORD value in backend/.env)`);
    console.log(`  Display:  ${user.displayId ?? '(not yet generated)'}`);
    console.log(`  Role:     ADMIN`);
    console.log('\nLog in at http://localhost:3000/login — you will be routed to /admin.');
  } catch (error) {
    console.error('\n❌ Seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
