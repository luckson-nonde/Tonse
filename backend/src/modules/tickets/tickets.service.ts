import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { DataSource, In, Repository } from 'typeorm';
import { MailerService } from '../../common/mail/mailer.service';
import { fromNgwee, splitCommission, toNgwee } from '../../common/money/money';
import { EventCodeUtil, TicketCodeUtil } from '../../utils/event-code.util';
import { ACCOUNT } from '../ledger/ledger-accounts';
import { LedgerService } from '../ledger/ledger.service';
import { AddScannerDto } from './dto/add-scanner.dto';
import { CheckoutTicketsDto } from './dto/checkout-tickets.dto';
import { CreateTicketEventDto } from './dto/create-ticket-event.dto';
import { ScanTicketDto } from './dto/scan-ticket.dto';
import { UpdateEventTicketSettingsDto } from './dto/update-event-ticket-settings.dto';
import { UpdateTicketEventDto } from './dto/update-ticket-event.dto';
import { EventTicketSettings } from './entities/event-ticket-settings.entity';
import { TicketEventScanner } from './entities/ticket-event-scanner.entity';
import { TicketEvent } from './entities/ticket-event.entity';
import { TicketOrder, TicketOrderLineItem } from './entities/ticket-order.entity';
import { TicketTier } from './entities/ticket-tier.entity';
import { Ticket } from './entities/ticket.entity';

/** The caller identity the scan/door endpoints need off the JWT. */
interface AuthUser {
  id: string;
  email?: string;
}

const DEFAULT_COMMISSION_PERCENT = 5;

/** What a guest (and the seller's share preview) sees — never the raw rows. */
export interface PublicTicketEvent {
  code: string;
  title: string;
  description: string;
  venue: string;
  eventDate: Date;
  posterUrl: string | null;
  /** Exact venue pin — the digital ticket's "open in Google Maps" action. */
  latitude: number | null;
  longitude: number | null;
  organizerName: string | null;
  tiers: Array<{
    id: string;
    name: string;
    priceZmw: number;
    remainingQuantity: number;
    soldOut: boolean;
  }>;
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(TicketEvent)
    private readonly events: Repository<TicketEvent>,
    @InjectRepository(TicketTier)
    private readonly tiers: Repository<TicketTier>,
    @InjectRepository(TicketOrder)
    private readonly orders: Repository<TicketOrder>,
    @InjectRepository(Ticket)
    private readonly tickets: Repository<Ticket>,
    @InjectRepository(EventTicketSettings)
    private readonly settingsRepository: Repository<EventTicketSettings>,
    @InjectRepository(TicketEventScanner)
    private readonly scanners: Repository<TicketEventScanner>,
    private readonly ledger: LedgerService,
    private readonly mailer: MailerService,
    private readonly dataSource: DataSource,
  ) {}

  private readonly logger = new Logger(TicketsService.name);

  // ───── Settings (admin-managed commission) ─────────────────────────────

  async getOrCreateSettings(): Promise<EventTicketSettings> {
    const existing = await this.settingsRepository.find({ take: 1 });
    if (existing.length > 0) return existing[0];
    return this.settingsRepository.save(
      this.settingsRepository.create({ commissionPercent: DEFAULT_COMMISSION_PERCENT }),
    );
  }

  async getSettingsForAdmin() {
    const settings = await this.getOrCreateSettings();
    return {
      // Coerced: pg hands decimals back as strings.
      commissionPercent: Number(settings.commissionPercent ?? DEFAULT_COMMISSION_PERCENT),
    };
  }

  async updateSettings(dto: UpdateEventTicketSettingsDto) {
    const settings = await this.getOrCreateSettings();
    if (dto.commissionPercent !== undefined) settings.commissionPercent = dto.commissionPercent;
    await this.settingsRepository.save(settings);
    return this.getSettingsForAdmin();
  }

  // ───── Seller: event CRUD + stats ──────────────────────────────────────

  async createEvent(sellerId: string, dto: CreateTicketEventDto) {
    const eventDate = new Date(dto.eventDate);
    if (Number.isNaN(eventDate.getTime())) {
      throw new BadRequestException('Event date must be a real date and time.');
    }
    if (eventDate.getTime() < Date.now()) {
      throw new BadRequestException('The event date cannot be in the past.');
    }
    // A lone latitude (or longitude) is an unusable half-pin.
    if ((dto.latitude == null) !== (dto.longitude == null)) {
      throw new BadRequestException('Provide both latitude and longitude for the venue pin, or neither.');
    }

    const event = await this.events.save(
      this.events.create({
        sellerId,
        // Placeholder until the row id exists — the code is derived from it.
        code: `PENDING-${crypto.randomBytes(6).toString('hex')}`,
        title: dto.title,
        description: dto.description,
        venue: dto.venue,
        eventDate,
        posterUrl: dto.posterUrl ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        status: 'PUBLISHED',
      }),
    );

    // Two-step code generation (same as inquiry QIDs): derive from the row id,
    // salt-bump on the astronomically-unlikely collision.
    let salt = 0;
    let code = EventCodeUtil.generateCode(event.id);
    while (await this.events.countBy({ code })) {
      code = EventCodeUtil.generateCode(event.id, ++salt);
    }
    event.code = code;
    await this.events.save(event);

    await this.tiers.save(
      dto.tiers.map((tier) =>
        this.tiers.create({
          eventId: event.id,
          name: tier.name,
          priceZmw: tier.priceZmw,
          totalQuantity: tier.totalQuantity,
          remainingQuantity: tier.totalQuantity,
        }),
      ),
    );

    return this.getEventForSeller(sellerId, event.id);
  }

  private async assertOwnership(sellerId: string, eventId: string): Promise<TicketEvent> {
    const event = await this.events.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.sellerId !== sellerId) throw new ForbiddenException('This event is not yours');
    return event;
  }

  /** Events with per-event sales aggregates for the seller's list view. */
  async listMyEvents(sellerId: string) {
    const events = await this.events.find({ where: { sellerId }, order: { createdAt: 'DESC' } });
    if (events.length === 0) return [];
    const eventIds = events.map((e) => e.id);

    const allTiers = await this.tiers.find({ where: { eventId: In(eventIds) } });

    // Gross/net straight off PAID orders — commission was stamped per-order at
    // payment time, so a later rate change never rewrites history.
    const sums: Array<{ eventId: string; gross: string | null; net: string | null }> =
      await this.orders
        .createQueryBuilder('o')
        .select('o.eventId', 'eventId')
        .addSelect('SUM(o.totalAmountZmw)', 'gross')
        .addSelect('SUM(o.totalAmountZmw - COALESCE(o.commissionZmw, 0))', 'net')
        .where('o.eventId IN (:...eventIds) AND o.status = :status', {
          eventIds,
          status: 'PAID',
        })
        .groupBy('o.eventId')
        .getRawMany();
    const sumsByEvent = new Map(sums.map((s) => [s.eventId, s]));

    // Door attendance — how many sold tickets have been scanned in.
    const checkins: Array<{ eventId: string; count: string }> = await this.tickets
      .createQueryBuilder('t')
      .select('t.eventId', 'eventId')
      .addSelect('COUNT(*)', 'count')
      .where('t.eventId IN (:...eventIds) AND t.status = :status', {
        eventIds,
        status: 'REDEEMED',
      })
      .groupBy('t.eventId')
      .getRawMany();
    const checkinsByEvent = new Map(checkins.map((c) => [c.eventId, Number(c.count)]));

    return events.map((event) => {
      const eventTiers = allTiers.filter((t) => t.eventId === event.id);
      const row = sumsByEvent.get(event.id);
      return {
        ...event,
        // pg hands numerics back as strings; the frontend does map math.
        latitude: event.latitude == null ? null : Number(event.latitude),
        longitude: event.longitude == null ? null : Number(event.longitude),
        tiers: eventTiers.map((t) => ({
          id: t.id,
          name: t.name,
          priceZmw: Number(t.priceZmw),
          totalQuantity: t.totalQuantity,
          remainingQuantity: t.remainingQuantity,
        })),
        ticketsSold: eventTiers.reduce(
          (sum, t) => sum + (t.totalQuantity - t.remainingQuantity),
          0,
        ),
        checkedIn: checkinsByEvent.get(event.id) ?? 0,
        grossZmw: Number(row?.gross ?? 0),
        netZmw: Number(row?.net ?? 0),
      };
    });
  }

  async getEventForSeller(sellerId: string, eventId: string) {
    await this.assertOwnership(sellerId, eventId);
    const all = await this.listMyEvents(sellerId);
    return all.find((e) => e.id === eventId)!;
  }

  async updateEvent(sellerId: string, eventId: string, dto: UpdateTicketEventDto) {
    const event = await this.assertOwnership(sellerId, eventId);
    if (event.status === 'CANCELLED') {
      throw new ConflictException('A cancelled event cannot be edited');
    }
    if (dto.eventDate !== undefined) {
      const eventDate = new Date(dto.eventDate);
      if (Number.isNaN(eventDate.getTime())) {
        throw new BadRequestException('Event date must be a real date and time.');
      }
      event.eventDate = eventDate;
    }
    if (dto.title !== undefined) event.title = dto.title;
    if (dto.description !== undefined) event.description = dto.description;
    if (dto.venue !== undefined) event.venue = dto.venue;
    if (dto.posterUrl !== undefined) event.posterUrl = dto.posterUrl;
    if (dto.latitude !== undefined || dto.longitude !== undefined) {
      if (dto.latitude == null || dto.longitude == null) {
        throw new BadRequestException('Provide both latitude and longitude for the venue pin.');
      }
      event.latitude = dto.latitude;
      event.longitude = dto.longitude;
    }
    await this.events.save(event);
    return this.getEventForSeller(sellerId, eventId);
  }

  /** Stops sales immediately. Sold tickets stay VALID — refunds are a
   *  deliberately separate (unbuilt) flow. */
  async cancelEvent(sellerId: string, eventId: string) {
    const event = await this.assertOwnership(sellerId, eventId);
    event.status = 'CANCELLED';
    await this.events.save(event);
    return this.getEventForSeller(sellerId, eventId);
  }

  /** Attendee/purchase list for one of the seller's events — paid orders plus
   *  refunded ones, so the seller keeps the history after a cancellation. */
  async salesForEvent(sellerId: string, eventId: string) {
    await this.assertOwnership(sellerId, eventId);
    const orders = await this.orders.find({
      where: [
        { eventId, status: 'PAID' },
        { eventId, status: 'REFUNDED' },
      ],
      order: { createdAt: 'DESC' },
    });

    // Per-order door attendance ("2 of 3 in") for the attendee list.
    const scanned: Array<{ orderId: string; count: string }> = orders.length
      ? await this.tickets
          .createQueryBuilder('t')
          .select('t.orderId', 'orderId')
          .addSelect('COUNT(*)', 'count')
          .where('t.orderId IN (:...orderIds) AND t.status = :status', {
            orderIds: orders.map((o) => o.id),
            status: 'REDEEMED',
          })
          .groupBy('t.orderId')
          .getRawMany()
      : [];
    const scannedByOrder = new Map(scanned.map((s) => [s.orderId, Number(s.count)]));

    return orders.map((order) => ({
      id: order.id,
      reference: order.reference,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      buyerEmail: order.buyerEmail,
      lineItems: order.lineItems,
      ticketCount: order.lineItems.reduce((sum, li) => sum + li.quantity, 0),
      checkedInCount: scannedByOrder.get(order.id) ?? 0,
      totalAmountZmw: Number(order.totalAmountZmw),
      netZmw: Number(order.totalAmountZmw) - Number(order.commissionZmw ?? 0),
      status: order.status,
      refundedAt: order.refundedAt,
      purchasedAt: order.createdAt,
    }));
  }

  // ───── Delete / refund ─────────────────────────────────────────────────

  /**
   * Permanently remove an event that never sold a ticket. Anything with a
   * paid order is refused — those buyers must be refunded first, and the
   * order history has to survive as the audit trail behind the reversals.
   */
  async deleteEvent(sellerId: string, eventId: string) {
    await this.assertOwnership(sellerId, eventId);

    const sold = await this.orders.count({
      where: [
        { eventId, status: 'PAID' },
        { eventId, status: 'REFUNDED' },
      ],
    });
    if (sold > 0) {
      throw new ConflictException(
        'This event has ticket sales — cancel it and refund the buyers instead of deleting it.',
      );
    }

    await this.dataSource.transaction(async (m) => {
      // Abandoned PENDING/FAILED orders never minted tickets or moved money;
      // the ticket delete is defensive so no orphan can outlive its event.
      await m.getRepository(Ticket).delete({ eventId });
      await m.getRepository(TicketOrder).delete({ eventId });
      await m.getRepository(TicketEventScanner).delete({ eventId });
      await m.getRepository(TicketTier).delete({ eventId });
      await m.getRepository(TicketEvent).delete({ id: eventId });
    });

    return { deleted: true, eventId };
  }

  /**
   * Give every buyer their money back after the event was called off.
   *
   * Each order is refunded on its OWN transaction so one failure can't strand
   * the rest, and each is idempotent: the reversal carries the deterministic
   * key `reversal:<journalId>`, so a re-click re-reports rather than
   * double-pays. The refund amount is never recomputed — reversing the
   * original TICKET_SALE journal mirrors exactly what was charged, commission
   * included, so the buyer gets back precisely what they paid.
   */
  async refundAllForEvent(sellerId: string, eventId: string) {
    const event = await this.assertOwnership(sellerId, eventId);
    // Refunding while tickets are still on sale would be incoherent — money
    // going out one door as new buyers come in the other. Cancel first.
    if (event.status !== 'CANCELLED') {
      throw new ConflictException('Cancel the event first, then refund the buyers.');
    }
    const orders = await this.orders.find({
      where: [
        { eventId, status: 'PAID' },
        { eventId, status: 'REFUNDED' },
      ],
      order: { createdAt: 'ASC' },
    });

    const failed: Array<{ orderId: string; buyerName: string; reason: string }> = [];
    const emailQueue: TicketOrder[] = [];
    let refunded = 0;
    let alreadyRefunded = 0;
    let refundedAmountZmw = 0;

    for (const order of orders) {
      if (order.status === 'REFUNDED') {
        alreadyRefunded++;
        continue;
      }
      try {
        const journal = await this.ledger.findByIdempotencyKey(`ticket-sale:${order.id}`);
        if (!journal) {
          failed.push({
            orderId: order.id,
            buyerName: order.buyerName,
            reason: 'No sale record found for this order — refund it manually.',
          });
          continue;
        }

        // The seller's venture balance is what funds the claw-back. Checked
        // per order, immediately before reversing it, because an earlier
        // refund in this same loop has already reduced the balance.
        const sellerNetNgwee =
          toNgwee(String(order.totalAmountZmw)) - toNgwee(String(order.commissionZmw ?? 0));
        const balanceNgwee = toNgwee(await this.ledger.sellerBalance(event.sellerId));
        if (balanceNgwee < sellerNetNgwee) {
          failed.push({
            orderId: order.id,
            buyerName: order.buyerName,
            reason: `Your balance (ZMW ${fromNgwee(balanceNgwee)}) can't cover this refund of ZMW ${fromNgwee(sellerNetNgwee)}.`,
          });
          continue;
        }

        await this.dataSource.transaction(async (m) => {
          await this.ledger.reverse(
            journal.id,
            `Event cancelled — refunded ${order.buyerName} (${order.reference})`,
            m,
          );
          await m
            .getRepository(Ticket)
            .update({ orderId: order.id }, { status: 'VOID' });
          await m
            .getRepository(TicketOrder)
            .update({ id: order.id }, { status: 'REFUNDED', refundedAt: new Date() });
        });

        refunded++;
        refundedAmountZmw += Number(order.totalAmountZmw);
        if (order.buyerEmail) emailQueue.push(order);
      } catch (e: any) {
        this.logger.error(`Refund failed for order ${order.reference}: ${e?.message}`);
        failed.push({
          orderId: order.id,
          buyerName: order.buyerName,
          reason: e?.message || 'Refund failed — please try again.',
        });
      }
    }

    // Notices go out after all the money has moved — never inside the loop's
    // transactions, and never allowed to fail a refund that already settled.
    for (const order of emailQueue) {
      this.sendRefundEmail(event, order).catch((e) =>
        this.logger.error(`Refund email for ${order.reference} failed: ${e?.message}`),
      );
    }

    return {
      total: orders.length,
      refunded,
      alreadyRefunded,
      refundedAmountZmw,
      emailsQueued: this.mailer.enabled ? emailQueue.length : 0,
      failed,
    };
  }

  /** Plain "your money is on its way back" notice — no QR codes, the
   *  tickets it would have shown are void. */
  private async sendRefundEmail(event: TicketEvent, order: TicketOrder) {
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const when = new Date(event.eventDate).toLocaleString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    await this.mailer.send({
      to: order.buyerEmail!,
      subject: `Refunded — ${event.title} was cancelled`,
      html: `
      <div style="margin:0 auto;max-width:520px;font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;padding:20px;">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:22px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#C9973A;">Nyuwe Tickets</p>
          <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a;">${esc(event.title)} was cancelled</h1>
          <p style="margin:0 0 14px;font-size:14px;color:#334155;">
            Hi ${esc(order.buyerName)}, the organiser has cancelled this event
            (it was scheduled for ${esc(when)}), so your tickets have been
            voided and your money refunded in full.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
            <tr><td style="padding:16px;">
              <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Refunded</p>
              <p style="margin:4px 0 0;font-size:26px;font-weight:800;color:#059669;">ZMW ${Number(order.totalAmountZmw).toFixed(2)}</p>
              <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">Original payment ref ${esc(order.reference)}</p>
            </td></tr>
          </table>
          <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;">
            The refund goes back to the mobile-money number you paid with. Nothing else is needed from you.
          </p>
        </div>
      </div>`,
    });
  }

  // ───── Door team (scanners) + check-in ─────────────────────────────────

  async listScanners(sellerId: string, eventId: string) {
    await this.assertOwnership(sellerId, eventId);
    return this.scanners.find({ where: { eventId }, order: { createdAt: 'ASC' } });
  }

  async addScanner(sellerId: string, eventId: string, dto: AddScannerDto) {
    await this.assertOwnership(sellerId, eventId);
    const email = dto.email.trim().toLowerCase();
    const existing = await this.scanners.findOne({ where: { eventId, email } });
    if (existing) {
      // Re-adding just refreshes the label — assignment is idempotent.
      if (dto.name?.trim()) {
        existing.name = dto.name.trim();
        await this.scanners.save(existing);
      }
    } else {
      await this.scanners.save(
        this.scanners.create({ eventId, email, name: dto.name?.trim() || null }),
      );
    }
    return this.listScanners(sellerId, eventId);
  }

  async removeScanner(sellerId: string, eventId: string, scannerId: string) {
    await this.assertOwnership(sellerId, eventId);
    await this.scanners.delete({ id: scannerId, eventId });
    return this.listScanners(sellerId, eventId);
  }

  /**
   * Events the caller may work the door for: their own events, plus any event
   * where the organizer assigned their account email as a scanner. Powers the
   * /scan page's event picker (with live attendance).
   */
  async listScanEvents(user: AuthUser) {
    const email = (user.email || '').trim().toLowerCase();
    const assigned = email ? await this.scanners.find({ where: { email } }) : [];
    const assignedIds = assigned.map((s) => s.eventId);

    const events = await this.events.find({
      where: assignedIds.length
        ? [{ sellerId: user.id }, { id: In(assignedIds) }]
        : { sellerId: user.id },
      order: { eventDate: 'DESC' },
    });
    const live = events.filter((e) => e.status === 'PUBLISHED');
    if (live.length === 0) return [];
    const eventIds = live.map((e) => e.id);

    const counts: Array<{ eventId: string; total: string; scanned: string }> = await this.tickets
      .createQueryBuilder('t')
      .select('t.eventId', 'eventId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE t.status = 'REDEEMED')`, 'scanned')
      .where('t.eventId IN (:...eventIds)', { eventIds })
      .groupBy('t.eventId')
      .getRawMany();
    const countsByEvent = new Map(counts.map((c) => [c.eventId, c]));

    return live.map((event) => {
      const row = countsByEvent.get(event.id);
      return {
        id: event.id,
        code: event.code,
        title: event.title,
        venue: event.venue,
        eventDate: event.eventDate,
        posterUrl: event.posterUrl,
        role: event.sellerId === user.id ? ('ORGANIZER' as const) : ('SCANNER' as const),
        ticketsSold: Number(row?.total ?? 0),
        checkedIn: Number(row?.scanned ?? 0),
      };
    });
  }

  /**
   * The door moment: scan (or type) a TIX code, flip it VALID → REDEEMED
   * under lock, and answer with an ADMIT / reject verdict. Outcomes are
   * RESULTS, not exceptions — the scanner UI shows a green or red screen
   * either way; only "you're not on this door team" is a real error.
   */
  async scanTicket(user: AuthUser, dto: ScanTicketDto) {
    const code = TicketCodeUtil.normalizeCode(dto.code);
    return this.dataSource.transaction(async (m) => {
      const ticket = await m
        .getRepository(Ticket)
        .createQueryBuilder('t')
        .setLock('pessimistic_write')
        .where('t.code = :code', { code })
        .getOne();
      if (!ticket) return { result: 'NOT_FOUND' as const, code };

      const event = await m.getRepository(TicketEvent).findOne({ where: { id: ticket.eventId } });
      if (!event) return { result: 'NOT_FOUND' as const, code };

      const email = (user.email || '').trim().toLowerCase();
      const isOrganizer = event.sellerId === user.id;
      const isScanner =
        !isOrganizer &&
        !!email &&
        !!(await m
          .getRepository(TicketEventScanner)
          .findOne({ where: { eventId: event.id, email } }));
      if (!isOrganizer && !isScanner) {
        throw new ForbiddenException('You are not on the door team for this event.');
      }

      // Scanning inside event A must reject event B's (valid) ticket —
      // without admitting it anywhere or leaking the other event's door state.
      if (dto.eventId && dto.eventId !== event.id) {
        return {
          result: 'WRONG_EVENT' as const,
          code,
          eventTitle: event.title,
        };
      }

      const order = await m.getRepository(TicketOrder).findOne({ where: { id: ticket.orderId } });
      const tierName =
        order?.lineItems.find((li) => li.tierId === ticket.tierId)?.tierName ?? 'Ticket';
      const info = {
        code: ticket.code,
        tierName,
        buyerName: order?.buyerName ?? '—',
        buyerPhone: order?.buyerPhone ?? null,
        eventTitle: event.title,
      };

      if (ticket.status === 'REDEEMED') {
        return { result: 'ALREADY_USED' as const, checkedInAt: ticket.checkedInAt, ...info };
      }
      if (ticket.status === 'VOID') {
        return { result: 'VOID' as const, ...info };
      }

      ticket.status = 'REDEEMED';
      ticket.checkedInAt = new Date();
      ticket.checkedInBy = user.id;
      await m.getRepository(Ticket).save(ticket);

      return { result: 'ADMITTED' as const, checkedInAt: ticket.checkedInAt, ...info };
    });
  }

  // ───── Public (guest) side ─────────────────────────────────────────────

  private async findLiveEventByCode(rawCode: string): Promise<TicketEvent> {
    const code = EventCodeUtil.normalizeCode(rawCode);
    const event = code ? await this.events.findOne({ where: { code } }) : null;
    // CANCELLED reads as gone — don't leak that it ever existed.
    if (!event || event.status !== 'PUBLISHED') {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  async getPublicEvent(rawCode: string): Promise<PublicTicketEvent> {
    const event = await this.findLiveEventByCode(rawCode);
    const tiers = await this.tiers.find({ where: { eventId: event.id } });
    // Organizer display name only — nothing else off the users row is public.
    const [organizer] = await this.dataSource.query(
      `SELECT name FROM users WHERE id = $1`,
      [event.sellerId],
    );
    return {
      code: event.code,
      title: event.title,
      description: event.description,
      venue: event.venue,
      eventDate: event.eventDate,
      posterUrl: event.posterUrl,
      latitude: event.latitude == null ? null : Number(event.latitude),
      longitude: event.longitude == null ? null : Number(event.longitude),
      organizerName: organizer?.name ?? null,
      tiers: tiers.map((t) => ({
        id: t.id,
        name: t.name,
        priceZmw: Number(t.priceZmw),
        remainingQuantity: t.remainingQuantity,
        soldOut: t.remainingQuantity <= 0,
      })),
    };
  }

  /**
   * Step 1 of the guest purchase: price the selection SERVER-SIDE and park it
   * as a PENDING order. Stock is only fast-checked here — nothing is held, so
   * an abandoned "processing" spinner can't strand tickets. The authoritative
   * check happens under lock in `simulatePublicPayment`.
   */
  async initiatePublicCheckout(rawCode: string, dto: CheckoutTicketsDto) {
    const event = await this.findLiveEventByCode(rawCode);
    if (!dto.buyerPhone?.trim() && !dto.buyerEmail?.trim()) {
      throw new BadRequestException('Provide a phone number or an email so we can label your tickets.');
    }

    // Merge duplicate tier selections so the lock loop touches each tier once.
    const wanted = new Map<string, number>();
    for (const s of dto.selections) {
      wanted.set(s.tierId, (wanted.get(s.tierId) ?? 0) + s.quantity);
    }

    const tiers = await this.tiers.find({
      where: { id: In([...wanted.keys()]), eventId: event.id },
    });
    if (tiers.length !== wanted.size) {
      throw new BadRequestException('One of the selected ticket types does not belong to this event.');
    }

    let totalNgwee = 0;
    const lineItems: TicketOrderLineItem[] = tiers.map((tier) => {
      const quantity = wanted.get(tier.id)!;
      if (tier.remainingQuantity < quantity) {
        throw new ConflictException(
          `Only ${tier.remainingQuantity} "${tier.name}" ticket(s) left.`,
        );
      }
      const unitNgwee = toNgwee(String(tier.priceZmw));
      totalNgwee += unitNgwee * quantity;
      return {
        tierId: tier.id,
        tierName: tier.name,
        quantity,
        unitPriceZmw: Number(tier.priceZmw),
      };
    });

    const order = await this.orders.save(
      this.orders.create({
        eventId: event.id,
        reference: `TKT-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        buyerName: dto.buyerName.trim(),
        buyerPhone: dto.buyerPhone?.trim() || null,
        buyerEmail: dto.buyerEmail?.trim() || null,
        lineItems,
        totalAmountZmw: Number(fromNgwee(totalNgwee)),
        status: 'PENDING',
      }),
    );

    return {
      reference: order.reference,
      totalAmountZmw: Number(order.totalAmountZmw),
      eventTitle: event.title,
    };
  }

  /**
   * Step 2 — the ONE atomic commit that turns a paid-for order into tickets:
   * lock the order and its tiers `FOR UPDATE`, re-check stock, decrement,
   * mint per-attendee ticket codes, flip the order to PAID and post the
   * TICKET_SALE journal — all in a single transaction, so money and state
   * can never disagree. Replays return the already-minted tickets.
   *
   * TWO callers, one code path: CheckoutService.fundTicketSale after the PSP
   * verifies a real guest payment, and the public sandbox simulate endpoint
   * (which the controller gates to the sandbox provider). Idempotent on the
   * order (PAID short-circuit + `ticket-sale:${order.id}` journal key), so a
   * webhook racing a manual verify can never double-decrement stock.
   */
  async commitPaidTicketOrder(reference: string) {
    const committed = await this.dataSource.transaction(async (m) => {
      const order = await m
        .getRepository(TicketOrder)
        .createQueryBuilder('o')
        .setLock('pessimistic_write')
        .where('o.reference = :reference', { reference })
        .getOne();
      if (!order) throw new NotFoundException('Payment reference not found');

      if (order.status === 'PAID') {
        const existing = await m.getRepository(Ticket).find({ where: { orderId: order.id } });
        return { order, tickets: existing, event: null as TicketEvent | null, fresh: false };
      }
      if (order.status !== 'PENDING') {
        throw new ConflictException(`This payment can't be completed from status ${order.status}`);
      }

      const event = await m.getRepository(TicketEvent).findOne({ where: { id: order.eventId } });
      if (!event || event.status !== 'PUBLISHED') {
        throw new ConflictException('This event is no longer on sale.');
      }

      // Authoritative stock check-and-decrement, one tier at a time under lock.
      for (const li of order.lineItems) {
        const tier = await m
          .getRepository(TicketTier)
          .createQueryBuilder('t')
          .setLock('pessimistic_write')
          .where('t.id = :id', { id: li.tierId })
          .getOne();
        if (!tier || tier.remainingQuantity < li.quantity) {
          throw new ConflictException(
            `Sorry — "${li.tierName}" sold out while you were paying. You have not been charged.`,
          );
        }
        tier.remainingQuantity -= li.quantity;
        await m.getRepository(TicketTier).save(tier);
      }

      // Mint one code per admitted unit, salt-bumping on collision.
      const ticketRepo = m.getRepository(Ticket);
      const minted: Ticket[] = [];
      let seq = 0;
      for (const li of order.lineItems) {
        for (let i = 0; i < li.quantity; i++) {
          let salt = 0;
          let code = TicketCodeUtil.generateCode(`${order.id}:${seq}`);
          while (await ticketRepo.countBy({ code })) {
            code = TicketCodeUtil.generateCode(`${order.id}:${seq}`, ++salt);
          }
          minted.push(
            ticketRepo.create({
              orderId: order.id,
              eventId: order.eventId,
              tierId: li.tierId,
              code,
            }),
          );
          seq++;
        }
      }
      await ticketRepo.save(minted);

      // Real money: gross into PSP holding, seller's net into their venture
      // balance, platform commission recognised as revenue. Same shape as the
      // escrow release in collection.service.ts.
      const settings = await this.getOrCreateSettings();
      const commissionPercent = Number(settings.commissionPercent ?? DEFAULT_COMMISSION_PERCENT);
      const grossNgwee = toNgwee(String(order.totalAmountZmw));
      const { commission, net } = splitCommission(grossNgwee, commissionPercent);

      await this.ledger.postJournal(
        {
          type: 'TICKET_SALE',
          idempotencyKey: `ticket-sale:${order.id}`,
          description: `Ticket sale — ${event.title} (${order.reference})`,
          memo: {
            eventId: event.id,
            ticketOrderId: order.id,
            commissionPercent,
            grossNgwee,
          },
          lines: [
            { accountCode: ACCOUNT.PSP_HOLDING, direction: 'DEBIT', amountNgwee: grossNgwee },
            {
              accountCode: ACCOUNT.SELLER_PAYABLE,
              direction: 'CREDIT',
              amountNgwee: net,
              counterpartyId: event.sellerId,
            },
            ...(commission > 0
              ? [
                  {
                    accountCode: ACCOUNT.PLATFORM_COMMISSION_REVENUE,
                    direction: 'CREDIT' as const,
                    amountNgwee: commission,
                  },
                ]
              : []),
          ],
        },
        m,
      );

      order.status = 'PAID';
      order.commissionZmw = Number(fromNgwee(commission));
      await m.getRepository(TicketOrder).save(order);

      return { order, tickets: minted, event: event as TicketEvent | null, fresh: true };
    });

    // Email AFTER the commit, fire-and-forget — a slow or broken mail server
    // must never fail (or delay) a payment that already went through. Only
    // first-time mints send; idempotent replays stay silent.
    const emailQueued =
      committed.fresh && !!committed.order.buyerEmail && this.mailer.enabled;
    if (committed.fresh && committed.order.buyerEmail && committed.event) {
      const { event, order, tickets } = committed;
      this.sendTicketsEmail(event, order, tickets).catch((e) =>
        this.logger.error(`Ticket email for ${order.reference} failed: ${e?.message}`),
      );
    }

    return { ...this.paidOrderResponse(committed.order, committed.tickets), emailQueued };
  }

  /**
   * The buyer's tickets by email: one designed block per ticket with the QR
   * code embedded as a CID attachment (data: URIs are stripped by Gmail).
   * The poster rides on top so the email mirrors the ticket page.
   */
  private async sendTicketsEmail(event: TicketEvent, order: TicketOrder, tickets: Ticket[]) {
    const tierNames = new Map(order.lineItems.map((li) => [li.tierId, li.tierName]));
    const when = new Date(event.eventDate).toLocaleString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    const mapsUrl =
      event.latitude != null && event.longitude != null
        ? `https://www.google.com/maps/search/?api=1&query=${Number(event.latitude)},${Number(event.longitude)}`
        : null;
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const attachments = await Promise.all(
      tickets.map(async (t) => ({
        filename: `${t.code}.png`,
        content: await QRCode.toBuffer(t.code, { width: 320, margin: 1 }),
        cid: `qr-${t.code}`,
        contentType: 'image/png',
      })),
    );

    const posterBlock = event.posterUrl
      ? `<img src="${esc(event.posterUrl)}" alt="" style="width:100%;max-height:280px;object-fit:cover;display:block;border-radius:16px 16px 0 0;">`
      : '';
    const venueBlock = mapsUrl
      ? `<a href="${esc(mapsUrl)}" style="color:#a97c27;text-decoration:underline;">${esc(event.venue)} — open in Google Maps</a>`
      : esc(event.venue);

    const ticketBlocks = tickets
      .map((t) => {
        const tier = tierNames.get(t.tierId) ?? 'Ticket';
        return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;border:2px dashed #ecd9b3;border-radius:16px;background:#fdf6e9;">
          <tr>
            <td style="padding:18px;text-align:center;">
              <img src="cid:qr-${t.code}" alt="QR code for ${t.code}" width="160" height="160" style="display:block;margin:0 auto 10px;border-radius:8px;background:#fff;padding:6px;">
              <p style="margin:0;font-size:20px;font-weight:800;letter-spacing:3px;color:#0f172a;">${t.code}</p>
              <p style="margin:4px 0 0;font-size:12px;font-weight:700;color:#b07f24;text-transform:uppercase;letter-spacing:1px;">${esc(tier)}</p>
              <p style="margin:8px 0 0;font-size:12px;color:#64748b;">Admit one · ${esc(order.buyerName)}</p>
            </td>
          </tr>
        </table>`;
      })
      .join('');

    await this.mailer.send({
      to: order.buyerEmail!,
      subject: `Your ticket${tickets.length > 1 ? 's' : ''} — ${event.title}`,
      html: `
      <div style="margin:0 auto;max-width:520px;font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;padding:20px;">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          ${posterBlock}
          <div style="padding:22px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#C9973A;">Nyuwe Tickets</p>
            <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a;">${esc(event.title)}</h1>
            <p style="margin:0 0 4px;font-size:14px;color:#334155;"><strong>When:</strong> ${esc(when)}</p>
            <p style="margin:0 0 4px;font-size:14px;color:#334155;"><strong>Where:</strong> ${venueBlock}</p>
            <p style="margin:0 0 14px;font-size:14px;color:#334155;"><strong>Ticket holder:</strong> ${esc(order.buyerName)}${order.buyerPhone ? ` · ${esc(order.buyerPhone)}` : ''}</p>
            <p style="margin:0;font-size:13px;color:#64748b;">Show the QR code${tickets.length > 1 ? 's' : ''} below at the door — each one admits one person and can only be scanned once.</p>
            ${ticketBlocks}
            <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;">Paid ZMW ${Number(order.totalAmountZmw).toFixed(2)} · ref ${esc(order.reference)}</p>
          </div>
        </div>
      </div>`,
      attachments,
    });
  }

  /**
   * Server-rendered share page for `/tickets/public/:code/share` — the URL
   * sellers actually share. WhatsApp/Facebook crawlers don't run the SPA's
   * JavaScript, so the decorated link preview (poster, title, date, venue)
   * must come from real HTML meta tags; humans are redirected to the SPA
   * ticket page instantly. An unknown/cancelled event still redirects — the
   * SPA renders its own "not available" state.
   */
  async getShareHtml(rawCode: string, apiOrigin?: string): Promise<string> {
    const esc = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const appBase = (process.env.PROMOTER_APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

    let event: PublicTicketEvent | null = null;
    try {
      event = await this.getPublicEvent(rawCode);
    } catch {
      event = null;
    }
    const code = event?.code ?? EventCodeUtil.normalizeCode(rawCode);
    const target = `${appBase}/e/${encodeURIComponent(code)}`;
    const redirect = `
    <meta http-equiv="refresh" content="0;url=${esc(target)}">
    <script>window.location.replace(${JSON.stringify(target)});</script>`;

    if (!event) {
      return `<!doctype html><html><head><meta charset="utf-8"><title>Nyuwe Tickets</title>${redirect}</head><body><a href="${esc(target)}">Continue to the event</a></body></html>`;
    }

    const when = new Date(event.eventDate).toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    const description =
      `${when} · ${event.venue}` +
      (event.description ? ` — ${event.description.slice(0, 140)}` : '');
    // Crawlers need an ABSOLUTE image URL. Posters are stored absolute by the
    // app, but guard against relative `/uploads/…` values by resolving them
    // against this API's own origin (posters are served by the API host).
    const poster =
      event.posterUrl && event.posterUrl.startsWith('/')
        ? `${(apiOrigin || '').replace(/\/+$/, '')}${event.posterUrl}`
        : event.posterUrl;
    const image = poster
      ? `
    <meta property="og:image" content="${esc(poster)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:image" content="${esc(poster)}">
    <meta name="twitter:card" content="summary_large_image">`
      : `
    <meta name="twitter:card" content="summary">`;

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${esc(event.title)} · Nyuwe Tickets</title>
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Nyuwe">
    <meta property="og:title" content="${esc(event.title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="${esc(target)}">
    <meta name="description" content="${esc(description)}">
    <meta name="twitter:title" content="${esc(event.title)}">
    <meta name="twitter:description" content="${esc(description)}">${image}
    <meta name="theme-color" content="#1B3068">${redirect}
</head>
<body style="font-family:sans-serif;padding:2rem;text-align:center">
    <p>Taking you to <strong>${esc(event.title)}</strong>…</p>
    <a href="${esc(target)}">Continue to get your tickets</a>
</body>
</html>`;
  }

  /**
   * The guest's paid order + minted ticket codes, by order reference — what
   * the ticket page renders after a REAL payment settles (the settle endpoint
   * only reports a status; the tickets come from here). The reference is a
   * capability token, exactly as it already was for the simulate endpoint.
   */
  async getPaidPublicOrder(reference: string) {
    const order = await this.orders.findOne({ where: { reference } });
    if (!order) throw new NotFoundException('Payment reference not found');
    if (order.status !== 'PAID') {
      throw new ConflictException('This order has not been paid yet');
    }
    const minted = await this.tickets.find({ where: { orderId: order.id } });
    return this.paidOrderResponse(order, minted);
  }

  private paidOrderResponse(order: TicketOrder, tickets: Ticket[]) {
    const tierNames = new Map(order.lineItems.map((li) => [li.tierId, li.tierName]));
    return {
      orderId: order.id,
      reference: order.reference,
      status: 'PAID' as const,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      buyerEmail: order.buyerEmail,
      totalAmountZmw: Number(order.totalAmountZmw),
      tickets: tickets.map((t) => ({
        code: t.code,
        tierName: tierNames.get(t.tierId) ?? 'Ticket',
      })),
    };
  }
}
