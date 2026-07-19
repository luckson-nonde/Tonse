import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { IdempotencyKey } from '../../modules/idempotency/entities/idempotency-key.entity';

/**
 * Generic Idempotency-Key support for HTTP mutations.
 *
 * Opt-in per request: a call that carries an `Idempotency-Key` header gets
 * exactly-once semantics against replays — the offline write queue replays a
 * queued POST/PATCH under the same key, and a request whose response never made
 * it back to the client can be safely retried. Every request WITHOUT the header
 * (i.e. all existing traffic today) hits the early `return next.handle()` and is
 * completely unaffected — this is a true no-op unless a client opts in.
 *
 * Registered OUTSIDE Transform/ClassSerializer (earlier in app.module's provider
 * list) so the `tap` sees — and stores — the exact final response envelope the
 * client receives; a cache hit then returns that snapshot verbatim, byte-identical.
 *
 * Modeled on LedgerService.postJournal()'s unique-key guard, extended with a
 * PENDING placeholder so two concurrent requests under one key can't both run
 * the handler.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  /** A PENDING row older than this is treated as abandoned (client vanished
   *  mid-flight) and may be superseded — otherwise a dropped request would
   *  409 its own retry forever. */
  private static readonly PENDING_TTL_MS = 2 * 60 * 1000;

  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly repo: Repository<IdempotencyKey>,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const key: string | undefined = req.headers?.['idempotency-key'];

    // The whole "zero behavior change for every existing endpoint" guarantee:
    // no header (or a safe GET) → straight through, nothing else runs.
    if (!key || req.method === 'GET') return next.handle();

    const existing = await this.repo.findOne({ where: { key } });

    if (existing?.status === 'COMPLETED') {
      this.logger.log(`Idempotency-Key ${key} already completed — replaying stored response`);
      res.status(existing.statusCode ?? 200);
      return of(existing.responseBody);
    }

    if (existing?.status === 'PENDING' && !this.isStale(existing.createdAt)) {
      throw new ConflictException('A request with this Idempotency-Key is already being processed.');
    }

    // Claim the key. A concurrent sibling racing the same insert loses on the
    // unique index → we surface that as a 409 rather than double-running.
    if (existing) {
      // Stale PENDING — reclaim it in place.
      await this.repo.update({ key }, { status: 'PENDING', createdAt: new Date() });
    } else {
      try {
        await this.repo.insert({
          key,
          userId: req.user?.id ?? null,
          method: req.method,
          path: req.originalUrl ?? req.url,
          status: 'PENDING',
        });
      } catch {
        throw new ConflictException('A request with this Idempotency-Key is already being processed.');
      }
    }

    return next.handle().pipe(
      tap((body) => {
        const statusCode = res.statusCode ?? 200;
        // Fire-and-forget: persisting the snapshot must not delay the response,
        // and a failure here just means a future replay re-runs the handler.
        void this.repo
          .update({ key }, { status: 'COMPLETED', statusCode, responseBody: body ?? null })
          .catch((e) => this.logger.warn(`Failed to store idempotent response for ${key}: ${e?.message}`));
      }),
      catchError((err) => {
        // A hard rejection must not poison the key — drop the placeholder so the
        // caller can legitimately retry the same logical request.
        void this.repo.delete({ key }).catch(() => undefined);
        return throwError(() => err);
      }),
    );
  }

  private isStale(createdAt: Date): boolean {
    return Date.now() - new Date(createdAt).getTime() > IdempotencyInterceptor.PENDING_TTL_MS;
  }
}
