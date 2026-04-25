import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private dataSource: DataSource) {}

  /**
   * Clears all transactional data from the database.
   * Keeps users and core configuration to avoid locking everyone out.
   */
  async clearAllData(): Promise<void> {
    this.logger.log('Starting Factory Reset: Clearing all transactional data...');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Order matters if CASCADE is not used, but CASCADE is safer for deep relations
      const tables = [
        'audit_logs',
        'payments',
        'orders',
        'quotes',
        'inquiries',
        'schedules',
        'products',
        'shops',
      ];

      for (const table of tables) {
        this.logger.debug(`Truncating table: ${table}`);
        await queryRunner.query(`TRUNCATE TABLE "${table}" CASCADE`);
      }

      await queryRunner.commitTransaction();
      this.logger.log('Factory Reset successful. All transactional data cleared.');
    } catch (error) {
      const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error);
      this.logger.error('Factory Reset failed!', errorDetails);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
