import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, Subject } from 'rxjs';
import { randomUUID } from 'crypto';
import { Notification } from './entities/notification.entity';
import { Inquiry } from '../inquiries/entities/inquiry.entity';

/** Shape Nest's SSE serializer understands: `type` becomes the SSE `event:`
 *  line (what EventSource.addEventListener keys on), `id` the `id:` line. */
export interface StreamMessage {
  type: string;
  id?: string;
  data: string;
}

export type DurableType = 'NEW_LEAD' | 'QUOTE_RECEIVED' | 'RESERVE_RELEASED';
export type EphemeralType = 'QUOTE_COUNT_UPDATE' | 'LEAD_FULL' | 'PROVIDER_ACCEPTED';

/** DB enum → lowercase SSE event name (EventSource convention). */
const SSE_EVENT_NAME: Record<DurableType | EphemeralType, string> = {
  NEW_LEAD: 'new_lead',
  QUOTE_RECEIVED: 'quote_received',
  RESERVE_RELEASED: 'reserve_released',
  QUOTE_COUNT_UPDATE: 'quote_count_update',
  LEAD_FULL: 'lead_full',
  PROVIDER_ACCEPTED: 'provider_accepted',
};

/**
 * Uber-dispatch notification hub.
 *
 * Two tiers:
 *   Tier 1 (durable)  — notifyUsers(): writes `notifications` rows, then
 *                       pushes to every live connection. Missed events are
 *                       replayed via getCatchUp() on reconnect.
 *   Tier 2 (ephemeral)— broadcastEphemeral(): push-only counter/state sync
 *                       (quote counts, lead-full retractions, accept ticks).
 *                       Source of truth is recomputed by REST on refetch, so
 *                       losing one while offline is harmless.
 *
 * Connection registry is in-memory (Map<userId, Map<connectionId, Subject>>) —
 * nested so each browser tab holds its own connection and disconnects clean up
 * only themselves. A backend restart wipes the registry; clients reconnect
 * with backoff and backfill Tier-1 via catch-up. Deliberate zero-dependency
 * trade-off (no Redis/broker) for a single-process dev deployment.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly connections = new Map<string, Map<string, Subject<StreamMessage>>>();

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    // Entity-only injection (no InquiriesModule import — that would be a
    // cycle, since InquiriesModule imports THIS module for dispatch).
    @InjectRepository(Inquiry)
    private readonly inquiriesRepository: Repository<Inquiry>,
  ) {}

  // ── Stream registry ──────────────────────────────────────────────────

  registerConnection(userId: string): { id: string; observable: Observable<StreamMessage> } {
    const id = randomUUID();
    const subject = new Subject<StreamMessage>();
    if (!this.connections.has(userId)) this.connections.set(userId, new Map());
    this.connections.get(userId)!.set(id, subject);
    this.logger.log(`SSE connect user=${userId} conn=${id} (open=${this.connections.get(userId)!.size})`);
    return { id, observable: subject.asObservable() };
  }

  unregisterConnection(userId: string, id: string): void {
    const conns = this.connections.get(userId);
    if (!conns) return;
    conns.get(id)?.complete();
    conns.delete(id);
    if (conns.size === 0) this.connections.delete(userId);
    this.logger.log(`SSE disconnect user=${userId} conn=${id}`);
  }

  private push(userId: string, type: DurableType | EphemeralType, data: any, notifId?: string): void {
    const conns = this.connections.get(userId);
    if (!conns || conns.size === 0) return;
    const msg: StreamMessage = {
      type: SSE_EVENT_NAME[type],
      ...(notifId ? { id: notifId } : {}),
      data: JSON.stringify(data),
    };
    for (const subject of conns.values()) subject.next(msg);
  }

  // ── Tier 1: durable ──────────────────────────────────────────────────

  /**
   * Persist one notification row per recipient, then push to whoever is
   * connected. `build` lets per-user payloads differ if ever needed.
   */
  async notifyUsers(
    userIds: string[],
    type: DurableType,
    build: (userId: string) => {
      title: string;
      inquiryId?: string;
      quoteId?: string;
      data?: Record<string, any>;
    },
  ): Promise<Notification[]> {
    const unique = Array.from(new Set(userIds)).filter(Boolean);
    if (unique.length === 0) return [];
    const rows = unique.map((uid) =>
      this.notificationsRepository.create({ userId: uid, type, ...build(uid) }),
    );
    const saved = await this.notificationsRepository.save(rows);
    for (const row of saved) {
      this.push(
        row.userId,
        type,
        { notificationId: row.id, title: row.title, inquiryId: row.inquiryId, quoteId: row.quoteId, ...(row.data ?? {}) },
        row.id,
      );
    }
    return saved;
  }

  // ── Tier 2: ephemeral ────────────────────────────────────────────────

  broadcastEphemeral(userIds: string[], type: EphemeralType, data: Record<string, any>): void {
    for (const uid of new Set(userIds)) this.push(uid, type, data);
  }

  // ── REST surface ─────────────────────────────────────────────────────

  /**
   * Tier-1 events missed while disconnected (reconnect backfill).
   *
   * Raw SQL with an explicit UTC cast: `createdAt` is a naive `timestamp`
   * holding UTC wall-clock (the DB container runs UTC), but TypeORM's
   * MoreThan(Date) serialises in the NODE process's local timezone — on a
   * UTC+2 host that pushed `since` two hours into the future and returned
   * zero rows for every catch-up.
   */
  async getCatchUp(userId: string, since: Date): Promise<Notification[]> {
    return this.notificationsRepository.query(
      `SELECT * FROM notifications
         WHERE "userId" = $1
           AND "createdAt" > ($2::timestamptz AT TIME ZONE 'UTC')
         ORDER BY "createdAt" ASC
         LIMIT 200`,
      [userId, since.toISOString()],
    );
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationsRepository.count({ where: { userId, isRead: false } });
    return { count };
  }

  async findMine(userId: string, limit = 50): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 100),
    });
  }

  /**
   * Provider Accept/Decline on a NEW_LEAD (ownership-checked). Returns the
   * updated row plus the inquiry's fresh ACKNOWLEDGED count so the caller
   * (controller) can tick the buyer's "X providers accepted" counter live.
   */
  async updateStatus(
    id: string,
    userId: string,
    status: 'ACKNOWLEDGED' | 'DECLINED',
  ): Promise<{ notification: Notification; acceptedCount: number }> {
    const row = await this.notificationsRepository.findOne({ where: { id, userId } });
    if (!row) throw new NotFoundException('Notification not found');
    row.status = status;
    row.isRead = true;
    const saved = await this.notificationsRepository.save(row);
    let acceptedCount = 0;
    if (saved.inquiryId && saved.type === 'NEW_LEAD') {
      acceptedCount = await this.notificationsRepository.count({
        where: { inquiryId: saved.inquiryId, type: 'NEW_LEAD', status: 'ACKNOWLEDGED' },
      });
      // Buyer telemetry: tick "X providers accepted" on their inquiry card.
      if (status === 'ACKNOWLEDGED') {
        const inquiry = await this.inquiriesRepository.findOne({
          where: { id: saved.inquiryId },
          select: ['id', 'buyerId'],
        });
        if (inquiry?.buyerId) {
          this.broadcastEphemeral([inquiry.buyerId], 'PROVIDER_ACCEPTED', {
            inquiryId: saved.inquiryId,
            acceptedCount,
          });
        }
      }
    }
    return { notification: saved, acceptedCount };
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationsRepository.update({ userId, isRead: false }, { isRead: true });
  }
}
