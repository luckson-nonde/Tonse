import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { DataSource, In, Repository } from 'typeorm';
import { fromNgwee, splitCommission, toNgwee } from '../../common/money/money';
import { EventCodeUtil, TicketCodeUtil } from '../../utils/event-code.util';
import { ACCOUNT } from '../ledger/ledger-accounts';
import { LedgerService } from '../ledger/ledger.service';
import { CheckoutTicketsDto } from './dto/checkout-tickets.dto';
import { CreateTicketEventDto } from './dto/create-ticket-event.dto';
import { UpdateEventTicketSettingsDto } from './dto/update-event-ticket-settings.dto';
import { UpdateTicketEventDto } from './dto/update-ticket-event.dto';
import { EventTicketSettings } from './entities/event-ticket-settings.entity';
import { TicketEvent } from './entities/ticket-event.entity';
import { TicketOrder, TicketOrderLineItem } from './entities/ticket-order.entity';
import { TicketTier } from './entities/ticket-tier.entity';
import { Ticket } from './entities/ticket.entity';

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
    private readonly ledger: LedgerService,
    private readonly dataSource: DataSource,
  ) {}

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

  /** Attendee/purchase list for one of the seller's events. */
  async salesForEvent(sellerId: string, eventId: string) {
    await this.assertOwnership(sellerId, eventId);
    const orders = await this.orders.find({
      where: { eventId, status: 'PAID' },
      order: { createdAt: 'DESC' },
    });
    return orders.map((order) => ({
      id: order.id,
      reference: order.reference,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      buyerEmail: order.buyerEmail,
      lineItems: order.lineItems,
      ticketCount: order.lineItems.reduce((sum, li) => sum + li.quantity, 0),
      totalAmountZmw: Number(order.totalAmountZmw),
      netZmw: Number(order.totalAmountZmw) - Number(order.commissionZmw ?? 0),
      purchasedAt: order.createdAt,
    }));
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
   * Step 2 — the ONE atomic commit, standing in for a real PSP webhook:
   * lock the order and its tiers `FOR UPDATE`, re-check stock, decrement,
   * mint per-attendee ticket codes, flip the order to PAID and post the
   * TICKET_SALE journal — all in a single transaction, so money and state
   * can never disagree. Replays return the already-minted tickets.
   */
  async simulatePublicPayment(reference: string) {
    return this.dataSource.transaction(async (m) => {
      const order = await m
        .getRepository(TicketOrder)
        .createQueryBuilder('o')
        .setLock('pessimistic_write')
        .where('o.reference = :reference', { reference })
        .getOne();
      if (!order) throw new NotFoundException('Payment reference not found');

      if (order.status === 'PAID') {
        const existing = await m.getRepository(Ticket).find({ where: { orderId: order.id } });
        return this.paidOrderResponse(order, existing);
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

      return this.paidOrderResponse(order, minted);
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
  async getShareHtml(rawCode: string): Promise<string> {
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
    const image = event.posterUrl
      ? `
    <meta property="og:image" content="${esc(event.posterUrl)}">
    <meta name="twitter:image" content="${esc(event.posterUrl)}">
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

  private paidOrderResponse(order: TicketOrder, tickets: Ticket[]) {
    const tierNames = new Map(order.lineItems.map((li) => [li.tierId, li.tierName]));
    return {
      orderId: order.id,
      reference: order.reference,
      status: 'PAID' as const,
      buyerName: order.buyerName,
      totalAmountZmw: Number(order.totalAmountZmw),
      tickets: tickets.map((t) => ({
        code: t.code,
        tierName: tierNames.get(t.tierId) ?? 'Ticket',
      })),
    };
  }
}
