import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Advertisement } from './entities/advertisement.entity';
import { AdsService } from './ads.service';
import {
  STORAGE_DRIVER,
  StorageDriver,
  storageKeyFromUrl,
} from '../storage/storage-driver.interface';

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
    @Inject(STORAGE_DRIVER)
    private readonly storage: StorageDriver,
    private readonly adsService: AdsService,
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

    // Pop-up impressions only ever answer "recently" (the frequency cap and
    // the fairness ordering) — older rows are storage cost with no reader.
    // Separate try: losing the prune must never look like a media failure.
    try {
      const pruned = await this.adsService.prunePopupImpressions();
      if (pruned > 0) this.logger.log(`Pruned ${pruned} pop-up impression(s) older than 30 days`);
    } catch (e) {
      this.logger.error(`Pop-up impression prune failed: ${(e as Error).message}`);
    }
  }

  private async sweep(): Promise<number> {
    const rows = await this.ads.find();
    if (rows.length === 0) return 0;

    // One listing, then set membership — rather than an existence probe per
    // row. On object storage each probe is a network round trip, so a few
    // hundred ads would turn boot into a few hundred sequential HTTP calls.
    const present = new Set(await this.storage.list('public'));

    // SAFETY VALVE. "Storage is completely empty but the database has ads" is
    // far more likely a misconfigured bucket or a wrong prefix than genuine
    // total media loss — and this sweep DELETES rows, which is unrecoverable.
    // A handful of stranded rows renders as a broken image; a mass delete
    // destroys paid placements. Refuse, and say what to check.
    if (present.size === 0) {
      this.logger.error(
        `Ad media sweep ABORTED: ${this.storage.name} storage returned no objects at all, ` +
          `but ${rows.length} advertisement(s) exist. Refusing to delete them. ` +
          `Check STORAGE_DRIVER and the bucket/prefix configuration.`,
      );
      return 0;
    }

    let removed = 0;
    for (const ad of rows) {
      // mediaUrl is "/uploads/<file>" (early rows), an absolute
      // "https://…/uploads/<file>", or a CDN URL under object storage.
      // storageKeyFromUrl reduces all of them to the same key.
      const key = storageKeyFromUrl(ad.mediaUrl ?? '');
      if (key && present.has(key)) continue;

      await this.ads.delete(ad.id);
      removed++;
      this.logger.warn(
        `Deleted ad "${ad.title}" (${ad.status}, ${ad.id}) — media ${key || '(none)'} not in ${this.storage.name} storage`,
      );
    }
    return removed;
  }
}
