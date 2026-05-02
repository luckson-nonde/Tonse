/**
 * Admin seed
 * ------------
 * Creates the platform's root admin user. Idempotent: safe to re-run.
 *
 * Run via:
 *   cd backend && npm run seed
 *
 * After this script succeeds the admin can log in at /login on the frontend
 * with the email + password printed at the bottom of the script.
 */
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../app.module';
import { UsersService } from '../../modules/users/users.service';

const ADMIN_EMAIL = 'lucksoncnonde@gmail.com';
const ADMIN_NAME = 'Luckson Nonde';
const ADMIN_PASSWORD = 'cluckson19947';
const ADMIN_PHONE = '+260970000000';
// Fake-but-unique NRC so the three-tier identity uniqueness checks pass.
// Real NRCs use the format `123456/78/9`; this placeholder is intentionally
// non-conflicting with any real Zambian NRC.
const ADMIN_NRC = '999999/99/9';

async function bootstrap() {
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

      if (Object.keys(updates).length > 0) {
        await usersService.update(existing.id, updates as any);
        console.log(`✅ Existing user '${ADMIN_EMAIL}' was upgraded to ADMIN.`);
      } else {
        console.log(`ℹ️  Admin user '${ADMIN_EMAIL}' already exists — nothing to do.`);
      }
      console.log(`\nAdmin login credentials:`);
      console.log(`  Email:    ${ADMIN_EMAIL}`);
      console.log(`  Password: (unchanged — re-run with a different seed if you forgot it)`);
      console.log(`  Role:     ADMIN`);
      return;
    }

    // Fresh registration: hash password and use the existing register flow so
    // the UserEmail row + displayId + audit trail get created consistently.
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

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
    console.log(`  Password: ${ADMIN_PASSWORD}`);
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
