import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ReferralLink } from './entities/referral-link.entity';
import { Conversion } from './entities/conversion.entity';
import { Milestone } from './entities/milestone.entity';
import { EquityAward } from './entities/equity-award.entity';
import { PromoterSetting } from './entities/promoter-setting.entity';
import { PromoterProfile } from './entities/promoter-profile.entity';
import { User } from '../users/entities/user.entity';
import { UserEmail } from '../users/entities/user-email.entity';
import { PromotersService } from './services/promoters.service';
import { FunnelTrackingService } from './services/funnel-tracking.service';
import { MilestonesService } from './services/milestones.service';
import { PromoterController } from './controllers/promoter.controller';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Referrals module — hidden promoter programme (referral links, conversion
 * funnel, milestones, simulated equity ledger).
 *
 * Dependency direction matters: UsersModule, InquiriesModule, OrdersModule,
 * QuotesModule and AdminModule all import THIS module (funnel hooks +
 * admin CRUD), so this module must never import any of them back. User /
 * UserEmail are injected ENTITY-ONLY via forFeature — the same pattern
 * NotificationsModule uses for Inquiry.
 *
 * JwtModule.register({}) + ConfigModule are imported directly (mirroring
 * AuthModule's own setup) because AuthModule deliberately exports nothing;
 * PromotersService mints its own tokens with the same jwt.* config keys.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReferralLink,
      Conversion,
      Milestone,
      EquityAward,
      PromoterSetting,
      PromoterProfile,
      User, // entity-only — never import UsersModule here
      UserEmail, // entity-only
    ]),
    NotificationsModule,
    JwtModule.register({}),
    ConfigModule,
  ],
  providers: [PromotersService, FunnelTrackingService, MilestonesService],
  controllers: [PromoterController],
  exports: [PromotersService, FunnelTrackingService, MilestonesService],
})
export class ReferralsModule {}
