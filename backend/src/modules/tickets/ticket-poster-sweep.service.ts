import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { TicketEvent } from './entities/ticket-event.entity';
import {
  STORAGE_DRIVER,
  StorageDriver,
  storageKeyFromUrl,
} from '../storage/storage-driver.interface';

/**
 * Boot-time cleanup: NULL the posterUrl of any ticket event whose image file
 * no longer exists on disk (uploads that lived on the ephemeral container
 * filesystem before the persistent disk, erased by a redeploy).
 *
 * Same pattern as AdsMediaSweepService, but nulling instead of deleting — an
 * event is a live sales page with real sold tickets behind it; only the
 * decoration is unrecoverable. A null poster renders the imageless layouts
 * everywhere (share preview, ticket page, tickets) instead of broken <img>s
 * that Chrome's ORB turns into ERR_FAILED noise. Never throws: boot must not
 * die over cleanup.
 */
@Injectable()
export class TicketPosterSweepService implements OnModuleInit {
  private readonly logger = new Logger(TicketPosterSweepService.name);

  constructor(
    @InjectRepository(TicketEvent)
    private readonly events: Repository<TicketEvent>,
    @Inject(STORAGE_DRIVER)
    private readonly storage: StorageDriver,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const cleared = await this.sweep();
      if (cleared > 0) {
        this.logger.warn(`Cleared the poster on ${cleared} ticket event(s) whose image file is missing from disk`);
      }
    } catch (e) {
      this.logger.error(`Ticket poster sweep failed (events left as-is): ${(e as Error).message}`);
    }
  }

  private async sweep(): Promise<number> {
    const rows = await this.events.find({ where: { posterUrl: Not(IsNull()) } });
    if (rows.length === 0) return 0;

    // Single listing rather than one existence probe per row — each probe is a
    // network round trip on object storage.
    const present = new Set(await this.storage.list('public'));

    // Same safety valve as the ad sweep: an entirely empty listing alongside
    // rows that reference posters points at a misconfigured bucket, not at
    // genuine loss. Clearing every poster on that basis would be wrong.
    if (present.size === 0) {
      this.logger.error(
        `Ticket poster sweep ABORTED: ${this.storage.name} storage returned no objects, ` +
          `but ${rows.length} event(s) reference a poster. Check STORAGE_DRIVER and the bucket config.`,
      );
      return 0;
    }

    let cleared = 0;
    for (const event of rows) {
      // posterUrl may be "/uploads/<file>", an absolute app URL, or a CDN URL.
      const key = storageKeyFromUrl(event.posterUrl ?? '');
      if (key && present.has(key)) continue;

      await this.events.update(event.id, { posterUrl: null });
      cleared++;
      this.logger.warn(
        `Cleared poster on event "${event.title}" (${event.code}) — ${key || '(none)'} not in ${this.storage.name} storage`,
      );
    }
    return cleared;
  }
}
