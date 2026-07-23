import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
import { PspTransaction } from './entities/psp-transaction.entity';
import { WebhookEventRecord } from './entities/webhook-event.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { Inquiry } from '../inquiries/entities/inquiry.entity';
import { Order } from '../orders/entities/order.entity';
import { PaymentsService } from './payments.service';
import { CheckoutService } from './checkout.service';
import { PaymentsController } from './controllers/payments.controller';
import { CheckoutController, WebhookController } from './controllers/checkout.controller';
import { SandboxPaymentProvider } from './providers/sandbox.provider';
import { LencoPaymentProvider } from './providers/lenco.provider';
import { PAYMENT_PROVIDER } from './providers/payment-provider.interface';
import { LedgerModule } from '../ledger/ledger.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Payments.
 *
 * The provider is chosen at boot by `PAYMENT_PROVIDER` (sandbox | lenco).
 * Everything downstream depends on the PaymentProvider interface, never on a
 * concrete adapter — so going live is an env change, not a rewrite. Both
 * adapters are registered so the sandbox stays available for tests.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PspTransaction, WebhookEventRecord, Quote, Inquiry, Order]),
    LedgerModule,
    NotificationsModule,
  ],
  providers: [
    PaymentsService,
    CheckoutService,
    SandboxPaymentProvider,
    LencoPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService, SandboxPaymentProvider, LencoPaymentProvider],
      useFactory: (
        config: ConfigService,
        sandbox: SandboxPaymentProvider,
        lenco: LencoPaymentProvider,
      ) => (config.get<string>('psp.provider') === 'lenco' ? lenco : sandbox),
    },
  ],
  controllers: [PaymentsController, CheckoutController, WebhookController],
  exports: [PaymentsService, CheckoutService],
})
export class PaymentsModule {}
