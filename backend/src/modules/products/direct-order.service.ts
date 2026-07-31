import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { Product } from './entities/product.entity';
import { Inquiry } from '../inquiries/entities/inquiry.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { LedgerService } from '../ledger/ledger.service';
import { ACCOUNT } from '../ledger/ledger-accounts';
import { toNgwee } from '../../common/money/money';
import { NotificationsService } from '../notifications/notifications.service';
import { DisplayIdUtil } from '../../utils/display-id.util';

export interface DirectOrderResult {
  quoteId: string;
  inquiryId: string;
  orderNumber: string;
  collectionCode: string;
  totalAmount: number;
  quantity: number;
  remainingStock: number;
}

/**
 * Direct purchase: a buyer buys a priced, in-stock listing outright — no
 * provider response round-trip. One transaction lands the whole shape the
 * existing fulfilment rails key off (template: CheckoutService.fundEscrow):
 * a CLOSED targeted inquiry, a PAID quote with a collection code, the Order
 * row, an ESCROW_FUNDED journal (so completion performs a REAL escrow
 * release into the seller's venture account, unlike the legacy simulated
 * path), and the stock decrement. Payment itself is simulated client-side
 * per the dev convention — this endpoint is the moment it "clears".
 */
@Injectable()
export class DirectOrderService {
  private readonly logger = new Logger(DirectOrderService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationsService,
  ) {}

  async buy(buyerId: string, productId: string, quantity: number): Promise<DirectOrderResult> {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Quantity must be a whole number of at least 1');
    }

    const result = await this.dataSource.transaction(async (m) => {
      // Pessimistic lock: two simultaneous buyers can't both take the last
      // unit (plain read-then-write, as updateStock does, would race).
      const [product]: Product[] = await m.query(
        'SELECT * FROM products WHERE id = $1 FOR UPDATE',
        [productId],
      );
      if (!product) throw new NotFoundException('Product not found');
      if (product.isActive === false) {
        throw new ConflictException('This listing is no longer available');
      }
      if (product.sellerId === buyerId) {
        throw new ForbiddenException('You cannot buy your own listing');
      }

      // AMOUNT COMES FROM THE LISTING, never the client.
      const unitPrice = Number(product.price);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        throw new ConflictException(
          'This listing has no fixed price — request a quote from the shop instead',
        );
      }
      if ((product.stock ?? 0) < quantity) {
        throw new ConflictException(
          product.stock > 0
            ? `Only ${product.stock} left in stock`
            : 'This item is sold out',
        );
      }
      const totalAmount = Math.round(unitPrice * quantity * 100) / 100;

      const seller = await m.getRepository(User).findOne({ where: { id: product.sellerId } });

      // 1. The inquiry — born CLOSED: there is nothing left to respond to.
      //    Targeted + orderKind marker mirrors the Purchase-Order convention;
      //    inserting directly (not InquiriesService.create) skips matching/
      //    lead-notification side effects that don't apply to a done deal.
      const inquiryRepo = m.getRepository(Inquiry);
      let inquiry = inquiryRepo.create({
        title: `Order: ${product.name}`.slice(0, 255),
        description: `Direct purchase of ${quantity} × ${product.name} at ZMW ${unitPrice} each.`,
        buyerId,
        location: 'Direct purchase',
        items: [{ productId: product.id, title: product.name, quantity }],
        preferences: {},
        attributes: {
          orderKind: 'DIRECT_PURCHASE',
          productId: product.id,
          unitPrice,
          quantity,
        },
        processType: 'EXPRESS',
        status: 'CLOSED',
        maxQuotes: 1,
        targetedProviderId: product.sellerId,
      } as Partial<Inquiry>);
      inquiry = await inquiryRepo.save(inquiry);
      inquiry.displayId = DisplayIdUtil.generateDisplayId(inquiry.id);
      inquiry = await inquiryRepo.save(inquiry);

      // 2. The quote — born PAID, priced from the listing, with the
      //    collection code the handover flow looks up.
      const collectionCode = `PQ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const quoteRepo = m.getRepository(Quote);
      const quote = await quoteRepo.save(
        quoteRepo.create({
          inquiryId: inquiry.id,
          inquiryTitle: inquiry.title,
          providerId: product.sellerId,
          providerName: seller?.name || 'Shop',
          price: totalAmount,
          condition: product.condition || 'NEW',
          message: `Direct purchase — ${quantity} × ${product.name} at the listed price.`,
          status: 'PAID',
          processType: 'EXPRESS',
          collectionCode,
          itemPrices: [
            {
              itemId: product.id,
              name: product.name,
              quantity,
              price: unitPrice,
            },
          ],
        } as Partial<Quote>),
      );

      // 3. The order row — same shape fundEscrow creates.
      const orderNumber = `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      await m.getRepository(Order).save(
        m.getRepository(Order).create({
          orderNumber,
          quoteId: quote.id,
          buyerId,
          sellerId: product.sellerId,
          totalAmount,
          items: [{ productId: product.id, title: product.name, quantity, unitPrice }],
        } as Partial<Order>),
      );

      // 4. Escrow becomes real — Dr PSP_HOLDING / Cr ESCROW_LIABILITY, so
      //    CollectionService.complete() later performs an actual release
      //    into the seller's venture balance instead of a silent no-op.
      await this.ledger.postJournal(
        {
          type: 'ESCROW_FUNDED',
          idempotencyKey: `direct-order:${quote.id}`,
          quoteId: quote.id,
          currency: 'ZMW',
          description: `Escrow funded for ${inquiry.title}`,
          memo: {
            source: 'DIRECT_PURCHASE',
            productId: product.id,
            quantity,
            unitPrice,
          },
          lines: [
            {
              accountCode: ACCOUNT.PSP_HOLDING,
              direction: 'DEBIT',
              amountNgwee: toNgwee(String(totalAmount)),
              quoteId: quote.id,
            },
            {
              accountCode: ACCOUNT.ESCROW_LIABILITY,
              direction: 'CREDIT',
              amountNgwee: toNgwee(String(totalAmount)),
              quoteId: quote.id,
              counterpartyId: buyerId,
            },
          ],
        },
        m,
      );

      // 5. Inventory: decrement inside the same transaction (the row is
      //    already locked above).
      const remainingStock = (product.stock ?? 0) - quantity;
      await m.getRepository(Product).update(product.id, { stock: remainingStock });

      return {
        quoteId: quote.id,
        inquiryId: inquiry.id,
        orderNumber,
        collectionCode,
        totalAmount,
        quantity,
        remainingStock,
        sellerId: product.sellerId,
        productName: product.name,
      };
    });

    // 6. Seller alert — outside the transaction (a failed push must never
    //    roll back a completed sale).
    try {
      await this.notifications.notifyUsers([result.sellerId], 'ORDER_PAID', () => ({
        title: `Sold: ${result.quantity} × ${result.productName}`,
        quoteId: result.quoteId,
        inquiryId: result.inquiryId,
        data: {
          body: `ZMW ${result.totalAmount.toLocaleString()} paid into escrow — prepare the order for collection.`,
          orderKind: 'DIRECT_PURCHASE',
          collectionCode: result.collectionCode,
          remainingStock: result.remainingStock,
        },
      }));
    } catch (e) {
      this.logger.warn(`ORDER_PAID notification failed: ${(e as Error).message}`);
    }

    this.logger.log(
      `Direct purchase: quote ${result.quoteId}, ${result.quantity} unit(s), stock left ${result.remainingStock}`,
    );
    const { sellerId: _s, productName: _p, ...publicResult } = result;
    return publicResult;
  }
}
