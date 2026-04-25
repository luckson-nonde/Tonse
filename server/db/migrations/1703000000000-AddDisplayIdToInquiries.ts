import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddDisplayIdToInquiries1703000000000 implements MigrationInterface {
  name = 'AddDisplayIdToInquiries1703000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Add displayId column
    await queryRunner.addColumn(
      'inquiries',
      new TableColumn({
        name: 'displayId',
        type: 'varchar',
        length: '20',
        isUnique: true,
        isNullable: true,
      })
    );

    // Add index on displayId
    await queryRunner.createIndex(
      'inquiries',
      new TableIndex({
        columnNames: ['displayId'],
        name: 'idx_inquiries_display_id',
      })
    );

    // Populate displayId for existing inquiries using a hash function
    await queryRunner.query(`
      UPDATE inquiries 
      SET "displayId" = 'QID-' || SUBSTR(MD5(id::text), 1, 6)
      WHERE "displayId" IS NULL;
    `);

    // Make displayId NOT NULL
    await queryRunner.changeColumn(
      'inquiries',
      'displayId',
      new TableColumn({
        name: 'displayId',
        type: 'varchar',
        length: '20',
        isUnique: true,
        isNullable: false,
      })
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('inquiries', 'idx_inquiries_display_id');

    // Remove column
    await queryRunner.dropColumn('inquiries', 'displayId');
  }
}
