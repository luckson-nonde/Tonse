import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Advertisement } from './entities/advertisement.entity';
import { getUploadsDir } from '../../config/storage.config';

/**
 * Boot-time cleanup: DELETE any advertisement whose media file no longer
 * exists on disk.
 *
 * Why deletion rather than a placeholder: the media IS the ad — a creative-
 * less ad row can only ever render broken, and the platform owner chose
 * removal over placeholders. The historical cause is uploads living on the
 * ephemeral container filesystem, where every redeploy erased the files but
 * left the rows behind, 404ing on every rail (and the 404 fallthrough past
 * helmet's CORP header is what surfaced as ERR_BLOCKED_BY_RESPONSE).
 *
 * Runs at every boot (same pattern as LedgerBootstrapService): on the first
 * deploy after the persistent disk is mounted, the disk starts empty, so this
 * sweep clears every stranded pre-disk row in prod — the only way to touch
 * that database. From then on it's a no-op unless files genuinely vanish.
 *
 * All statuses are swept, paid ones included — their files are unrecoverable,
 * and payments here are simulated. Never throws: boot must not die over
 * cleanup (failures are logged loudly instead).
 */
@Injectable()
export class AdsMediaSweepService implements OnModuleInit {
  private readonly logger = new Logger(AdsMediaSweepService.name);

  constructor(
    @InjectRepository(Advertisement)
    private readonly ads: Repository<Advertisement>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const removed = await this.sweep();
      if (removed > 0) {
        this.logger.warn(`Deleted ${removed} advertisement(s) whose media file is missing from disk`);
      }
    } catch (e) {
      this.logger.error(`Ad media sweep failed (ads left as-is): ${(e as Error).message}`);
    }
  }

  private async sweep(): Promise<number> {
    const uploadsDir = getUploadsDir();
    const rows = await this.ads.find();
    let removed = 0;

    for (const ad of rows) {
      // mediaUrl is either "/uploads/<file>" (early rows) or an absolute
      // "https://…/uploads/<file>" (current) — the basename is the file
      // either way. Windows-safe: URLs always use forward slashes.
      const filename = (ad.mediaUrl ?? '').split('/').pop() ?? '';
      const exists = filename !== '' && fs.existsSync(path.join(uploadsDir, filename));
      if (exists) continue;

      await this.ads.delete(ad.id);
      removed++;
      this.logger.warn(
        `Deleted ad "${ad.title}" (${ad.status}, ${ad.id}) — media ${filename || '(none)'} not on disk`,
      );
    }
    return removed;
  }
}
