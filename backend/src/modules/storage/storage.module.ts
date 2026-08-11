import { Global, Module, Logger } from '@nestjs/common';
import { STORAGE_DRIVER } from './storage-driver.interface';
import { FilesystemStorageDriver } from './filesystem.driver';
import { SpacesStorageDriver } from './spaces.driver';
import { getStorageDriverName } from '../../config/storage.config';

/**
 * Storage.
 *
 * The driver is chosen at boot by `STORAGE_DRIVER` (filesystem | spaces).
 * Everything downstream depends on the StorageDriver interface, never on a
 * concrete driver, so moving to a platform without persistent volumes is an
 * env change rather than a rewrite.
 *
 * Global because uploads are written from four unrelated modules (files,
 * inquiries, ads, tickets) and threading an import through each of them buys
 * nothing — this is infrastructure, like the ledger's DataSource.
 */
@Global()
@Module({
  providers: [
    FilesystemStorageDriver,
    SpacesStorageDriver,
    {
      provide: STORAGE_DRIVER,
      inject: [FilesystemStorageDriver, SpacesStorageDriver],
      useFactory: (fsDriver: FilesystemStorageDriver, spaces: SpacesStorageDriver) => {
        const chosen = getStorageDriverName() === 'spaces' ? spaces : fsDriver;
        // Worth a boot line: "where did my uploads go" is otherwise a silent,
        // deploy-time-only failure, and the answer is exactly this choice.
        new Logger('StorageModule').log(`Upload storage driver: ${chosen.name}`);
        return chosen;
      },
    },
  ],
  exports: [STORAGE_DRIVER, FilesystemStorageDriver, SpacesStorageDriver],
})
export class StorageModule {}
