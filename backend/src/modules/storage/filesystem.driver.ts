import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  StorageClass,
  StorageDriver,
  assertSafeStorageKey,
} from './storage-driver.interface';
import { getSecureUploadsDir, getUploadsDir } from '../../config/storage.config';

/**
 * Local/mounted-disk storage — what the existing Render deploy runs on.
 *
 * This is a faithful extraction of the behaviour that was previously inline in
 * FilesService and friends, NOT a reimplementation: same directories, same URL
 * shapes, same best-effort deletes. That is deliberate — Render stays in
 * production, so this path must not change in any observable way.
 */
@Injectable()
export class FilesystemStorageDriver implements StorageDriver {
  readonly name = 'filesystem';
  private readonly logger = new Logger(FilesystemStorageDriver.name);

  private root(storageClass: StorageClass): string {
    return storageClass === 'secure' ? getSecureUploadsDir() : getUploadsDir();
  }

  /** Resolve a key to an absolute path, refusing anything outside the root. */
  private resolve(key: string, storageClass: StorageClass): string {
    assertSafeStorageKey(key);
    const root = path.resolve(this.root(storageClass));
    const full = path.resolve(root, key);
    // Belt and braces: assertSafeStorageKey already rejects traversal, but the
    // containment check is what actually guarantees it after resolution.
    if (full !== root && !full.startsWith(root + path.sep)) {
      throw new Error(`Unsafe storage key: ${key}`);
    }
    return full;
  }

  async put(
    key: string,
    body: Buffer,
    opts: { storageClass: StorageClass; contentType?: string },
  ): Promise<string> {
    const full = this.resolve(key, opts.storageClass);
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.writeFile(full, body);
    return opts.storageClass === 'secure' ? `/files/secure/${key}` : `/uploads/${key}`;
  }

  async get(key: string, storageClass: StorageClass): Promise<Buffer> {
    const full = this.resolve(key, storageClass);
    try {
      return await fs.promises.readFile(full);
    } catch {
      throw new NotFoundException('File not found');
    }
  }

  async delete(key: string, storageClass: StorageClass): Promise<void> {
    try {
      await fs.promises.unlink(this.resolve(key, storageClass));
    } catch {
      // Best-effort: a missing or locked file must never fail the caller
      // (account erasure in particular has to keep going).
    }
  }

  async exists(key: string, storageClass: StorageClass): Promise<boolean> {
    try {
      await fs.promises.access(this.resolve(key, storageClass));
      return true;
    } catch {
      return false;
    }
  }

  /** Recursive, so nested keys (`inquiries/x.jpg`) are listed as stored. */
  async list(storageClass: StorageClass): Promise<string[]> {
    const root = this.root(storageClass);
    const out: string[] = [];
    const walk = async (dir: string, prefix: string): Promise<void> => {
      let entries: fs.Dirent[];
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch {
        return; // directory not created yet — nothing stored
      }
      for (const e of entries) {
        const rel = prefix ? `${prefix}/${e.name}` : e.name;
        if (e.isDirectory()) await walk(path.join(dir, e.name), rel);
        else out.push(rel);
      }
    };
    await walk(root, '');
    return out;
  }
}
