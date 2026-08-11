import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
import { PspTransaction } from './entities/psp-transaction.entity';
import { WebhookEventRecord } from './entities/webhook-event.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { Inquiry } from '../inquiries/entities/inquiry.entity';
import { Order } from '../orders/entities/order.entity';
import { Advertisement } from '../ads/entities/advertisement.entity';
import { PaymentsService } from './payments.service';
import { CheckoutService } from './checkout.service';
import { PaymentsController } from './controllers/payments.controller';
import { CheckoutController, WebhookController } from './controllers/checkout.controller';
import { SandboxPaymentProvider } from './providers/sandbox.provider';
import { DpoPaymentProvider } from './providers/dpo.provider';
import { PAYMENT_PROVIDER } from './providers/payment-provider.interface';
import { LedgerModule } from '../ledger/ledger.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Payments.
 *
 * The provider is chosen at boot by `PAYMENT_PROVIDER` (sandbox | dpo).
 * Everything downstream depends on the PaymentProvider interface, never on a
 * concrete adapter — so going live is an env change, not a rewrite. Both
 * adapters are registered so the sandbox stays available for tests.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PspTransaction, WebhookEventRecord, Quote, Inquiry, Order, Advertisement]),
    LedgerModule,
    NotificationsModule,
  ],
  providers: [
    PaymentsService,
    CheckoutService,
    SandboxPaymentProvider,
    DpoPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService, SandboxPaymentProvider, DpoPaymentProvider],
      useFactory: (
        config: ConfigService,
        sandbox: SandboxPaymentProvider,
        dpo: DpoPaymentProvider,
      ) => (config.get<string>('psp.provider') === 'dpo' ? dpo : sandbox),
    },
  ],
  controllers: [PaymentsController, CheckoutController, WebhookController],
  exports: [PaymentsService, CheckoutService],
})
export class PaymentsModule {}
