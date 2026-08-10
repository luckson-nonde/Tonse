import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { TicketEvent } from './entities/ticket-event.entity';
import { getUploadsDir } from '../../config/storage.config';

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
    const uploadsDir = getUploadsDir();
    const rows = await this.events.find({ where: { posterUrl: Not(IsNull()) } });
    let cleared = 0;

    for (const event of rows) {
      // posterUrl is "/uploads/<file>" or an absolute "https://…/uploads/<file>"
      // — the basename is the file either way.
      const filename = (event.posterUrl ?? '').split('/').pop() ?? '';
      const exists = filename !== '' && fs.existsSync(path.join(uploadsDir, filename));
      if (exists) continue;

      await this.events.update(event.id, { posterUrl: null });
      cleared++;
      this.logger.warn(
        `Cleared poster on event "${event.title}" (${event.code}) — ${filename || '(none)'} not on disk`,
      );
    }
    return cleared;
  }
}
