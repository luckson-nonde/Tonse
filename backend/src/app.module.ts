import { ClassSerializerInterceptor, Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// Middleware
import { ApiVersionMiddleware } from './common/middleware/api-version.middleware';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { InquiriesModule } from './modules/inquiries/inquiries.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductsModule } from './modules/products/products.module';
import { ShopsModule } from './modules/shops/shops.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/admin/admin.module';
import { FilesModule } from './modules/files/files.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TeamModule } from './modules/team/team.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { CollectionModule } from './modules/collection/collection.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { LoanModule } from './modules/loans/loans.module';
import { BillingModule } from './modules/billing/billing.module';
import { SiteSettingsModule } from './modules/site-settings/site-settings.module';
import { ConsentsModule } from './modules/consents/consents.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { VentureModule } from './modules/venture/venture.module';

// Common
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { AuditContextInterceptor } from './common/audit/audit-context.interceptor';
import { IdempotencyKey } from './modules/idempotency/entities/idempotency-key.entity';

// Config
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import encryptionConfig from './config/encryption.config';
import pspConfig from './config/lenco.config';
import promoterConfig from './config/promoter.config';
import webpushConfig from './config/webpush.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [databaseConfig, jwtConfig, encryptionConfig, pspConfig, promoterConfig, webpushConfig],
    }),
    // Global default: generous enough for normal browsing (dashboards
    // firing several requests on load), tight enough to blunt scripted
    // abuse. Individual routes (see AuthController) override this with a
    // much tighter limit via @Throttle.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 200 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.name'),
        entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/**/*{.ts,.js}'],
        synchronize: configService.get('database.synchronize'),
        migrationsRun: configService.get('database.runMigrations'),
        logging: configService.get('database.logging'),
        ssl: configService.get('database.ssl'),
      }),
    }),
    AuthModule,
    UsersModule,
    InquiriesModule,
    QuotesModule,
    OrdersModule,
    PaymentsModule,
    ProductsModule,
    ShopsModule,
    SchedulesModule,
    AuditModule,
    AdminModule,
    FilesModule,
    CategoriesModule,
    TeamModule,
    PortfolioModule,
    NotificationsModule,
    ReferralsModule,
    ReportsModule,
    ReviewsModule,
    CollectionModule,
    JobsModule,
    LoanModule,
    BillingModule,
    SiteSettingsModule,
    ConsentsModule,
    LedgerModule,
    VentureModule,
    // The IdempotencyInterceptor (an APP_INTERCEPTOR below) needs this repo.
    TypeOrmModule.forFeature([IdempotencyKey]),
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Exactly-once replay for opt-in mutations (offline write queue). A no-op
    // unless the request carries an `Idempotency-Key` header. Registered before
    // Transform/ClassSerializer so its stored + replayed response is the exact
    // final envelope; before AuditContext because a cache-hit short-circuits and
    // never needs the ambient audit context.
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    // Establishes the per-request audit actor context (who + IP + UA) so every
    // audit write is attributed automatically. Registered before Transform so
    // it wraps the handler execution.
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Second line of defense behind the entities' `select: false` columns
    // (the real protection, already verified). This makes @Exclude()
    // actually strip password/pin/refreshToken/etc. if a future query ever
    // returns one of those class instances directly instead of through the
    // existing flatten/DTO paths. Registered after TransformInterceptor so
    // it runs on the raw controller return value, not the wrapped envelope.
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiVersionMiddleware).forRoutes('*');
  }
}
