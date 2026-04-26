import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

/**
 * Migration: Add Three-Tier Identity System
 *
 * This migration:
 * 1. Updates users table to add NRC anchor and displayId
 * 2. Creates user_emails table for multiple emails per user
 * 3. Creates identity_audits table for full audit trail
 * 4. Establishes relationships and indexes for performance
 *
 * Design:
 * - NRC: Immutable, unique constraint (one per real person)
 * - UUID: System identifier (internal operations)
 * - displayId: User-facing identifier (USER-XXXXXX)
 * - Multiple emails: Via user_emails table, all linked to same NRC/UUID
 * - Audit trail: Full history of identity changes
 */
export class CreateIdentitySystem1704000000000 implements MigrationInterface {
  name = 'CreateIdentitySystem1704000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ===== STEP 1: Update users table =====

    // Add NRC Number column (immutable anchor)
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'nrcNumber',
        type: 'varchar',
        length: '50',
        isUnique: true,
        isNullable: true,
      })
    );

    // Add displayId column (user-facing)
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'displayId',
        type: 'varchar',
        length: '20',
        isUnique: true,
        isNullable: true,
      })
    );

    // Add primaryEmailId column (reference to user_emails)
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'primaryEmailId',
        type: 'uuid',
        isNullable: true,
      })
    );

    // Rename email to primaryEmail and allow null temporarily
    await queryRunner.renameColumn('users', 'email', 'primaryEmail');

    // Update primaryEmail to be nullable (will set to actual emails from user_emails)
    await queryRunner.changeColumn(
      'users',
      'primaryEmail',
      new TableColumn({
        name: 'primaryEmail',
        type: 'varchar',
        length: '255',
        isUnique: false,
        isNullable: true,
      })
    );

    // Add NRC verification columns
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'isNrcVerified',
        type: 'boolean',
        default: false,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'nrcDocumentPath',
        type: 'varchar',
        length: '500',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'lastNrcVerificationAt',
        type: 'timestamp',
        isNullable: true,
      })
    );

    // Update verificationStatus enum values
    await queryRunner.query(`
      ALTER TABLE users 
      DROP CONSTRAINT users_verificationstatus_check
    `);

    await queryRunner.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_verificationstatus_check 
      CHECK (verificationstatus IN ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'))
    `);

    // Add indexes on new columns
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        columnNames: ['nrcNumber'],
        name: 'idx_users_nrc',
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        columnNames: ['displayId'],
        name: 'idx_users_display_id',
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        columnNames: ['primaryEmailId'],
        name: 'idx_users_email_primary',
      })
    );

    // ===== STEP 2: Create user_emails table =====

    await queryRunner.createTable(
      new Table({
        name: 'user_emails',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'isPrimary',
            type: 'boolean',
            default: false,
          },
          {
            name: 'verificationStatus',
            type: 'enum',
            enum: ['NOT_VERIFIED', 'VERIFICATION_SENT', 'VERIFIED'],
            default: "'NOT_VERIFIED'",
          },
          {
            name: 'verificationToken',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'verificationTokenExpiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'verifiedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'isRecoveryEmail',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          }),
        ],
        indices: [
          {
            columnNames: ['email'],
            isUnique: true,
            name: 'idx_user_emails_email',
          },
          {
            columnNames: ['userId'],
            name: 'idx_user_emails_user_id',
          },
          {
            columnNames: ['isPrimary'],
            name: 'idx_user_emails_is_primary',
          },
          {
            columnNames: ['verificationStatus'],
            name: 'idx_user_emails_is_verified',
          },
          {
            columnNames: ['createdAt'],
            name: 'idx_user_emails_created_at',
          },
        ],
      })
    );

    // ===== STEP 3: Create identity_audits table =====

    await queryRunner.createTable(
      new Table({
        name: 'identity_audits',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'eventType',
            type: 'enum',
            enum: [
              'USER_REGISTERED',
              'NRC_VERIFIED',
              'NRC_VERIFICATION_FAILED',
              'EMAIL_ADDED',
              'EMAIL_REMOVED',
              'EMAIL_PRIMARY_CHANGED',
              'EMAIL_VERIFIED',
              'PASSWORD_CHANGED',
              'ACCOUNT_SUSPENDED',
              'ACCOUNT_REACTIVATED',
              'ACCOUNT_DELETED',
              'SUSPICIOUS_ACTIVITY',
              'ADMIN_ACTION',
            ],
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'previousValue',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'newValue',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'changedField',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'adminId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isSuspicious',
            type: 'boolean',
            default: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'verificationStatus',
            type: 'enum',
            enum: ['UNVERIFIED', 'VERIFIED', 'FRAUD'],
            default: "'UNVERIFIED'",
          },
          {
            name: 'statusNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          }),
        ],
        indices: [
          {
            columnNames: ['userId'],
            name: 'idx_identity_audits_user_id',
          },
          {
            columnNames: ['eventType'],
            name: 'idx_identity_audits_event_type',
          },
          {
            columnNames: ['createdAt'],
            name: 'idx_identity_audits_created_at',
          },
          {
            columnNames: ['userId', 'eventType'],
            name: 'idx_identity_audits_user_event',
          },
          {
            columnNames: ['userId', 'createdAt'],
            name: 'idx_identity_audits_user_date',
          },
        ],
      })
    );

    // ===== STEP 4: Migrate existing data =====

    // For existing users without NRC, generate placeholder NRC from UUID
    await queryRunner.query(`
      UPDATE users 
      SET "nrcNumber" = 'LEGACY_' || SUBSTRING(id::text, 1, 12)
      WHERE "nrcNumber" IS NULL;
    `);

    // Generate displayIds for existing users
    await queryRunner.query(`
      UPDATE users 
      SET "displayId" = 'USER-' || SUBSTRING(MD5(id::text), 1, 6)
      WHERE "displayId" IS NULL;
    `);

    // Migrate emails from users table to user_emails table
    await queryRunner.query(`
      INSERT INTO user_emails (id, "userId", email, "isPrimary", "verificationStatus", "verifiedAt", "createdAt", "updatedAt")
      SELECT 
        uuid_generate_v4(),
        id,
        "primaryEmail",
        true,
        'VERIFIED',
        NOW(),
        "createdAt",
        "updatedAt"
      FROM users
      WHERE "primaryEmail" IS NOT NULL;
    `);

    // Update users table to use email from user_emails (first email)
    await queryRunner.query(`
      UPDATE users u
      SET "primaryEmailId" = (
        SELECT id FROM user_emails WHERE "userId" = u.id AND "isPrimary" = true LIMIT 1
      )
      WHERE EXISTS (
        SELECT 1 FROM user_emails WHERE "userId" = u.id
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Drop identity_audits table
    await queryRunner.dropTable('identity_audits', true);

    // Drop user_emails table
    await queryRunner.dropTable('user_emails', true);

    // Drop new indexes and columns from users table
    await queryRunner.dropIndex('users', 'idx_users_nrc');
    await queryRunner.dropIndex('users', 'idx_users_display_id');
    await queryRunner.dropIndex('users', 'idx_users_email_primary');

    await queryRunner.dropColumn('users', 'nrcNumber');
    await queryRunner.dropColumn('users', 'displayId');
    await queryRunner.dropColumn('users', 'primaryEmailId');
    await queryRunner.dropColumn('users', 'isNrcVerified');
    await queryRunner.dropColumn('users', 'nrcDocumentPath');
    await queryRunner.dropColumn('users', 'lastNrcVerificationAt');

    // Revert verificationStatus enum
    await queryRunner.query(`
      ALTER TABLE users 
      DROP CONSTRAINT users_verificationstatus_check
    `);

    await queryRunner.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_verificationstatus_check 
      CHECK (verificationstatus IN ('PENDING', 'VERIFIED', 'REJECTED'))
    `);

    // Rename primaryEmail back to email
    await queryRunner.renameColumn('users', 'primaryEmail', 'email');

    // Restore email unique constraint and not null
    await queryRunner.changeColumn(
      'users',
      'email',
      new TableColumn({
        name: 'email',
        type: 'varchar',
        length: '255',
        isUnique: true,
        isNullable: false,
      })
    );
  }
}
