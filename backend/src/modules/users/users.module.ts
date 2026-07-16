import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserEmail } from './entities/user-email.entity';
import { BuyerProfile } from './entities/buyer-profile.entity';
import { SellerProfile } from './entities/seller-profile.entity';
import { ServiceProviderProfile } from './entities/service-provider-profile.entity';
import { SellerProfileCategory } from './entities/seller-profile-category.entity';
import { ServiceProviderProfileCategory } from './entities/service-provider-profile-category.entity';
import { SellerProfileArchetype } from './entities/seller-profile-archetype.entity';
import { ServiceProviderProfileArchetype } from './entities/service-provider-profile-archetype.entity';
import { Category } from '../categories/entities/category.entity';
import { UsersService } from './users.service';
import { UsersController } from './controllers/users.controller';
import { ArchetypeResolverService } from './services/archetype-resolver.service';
import { ProfileMatchingService } from './services/profile-matching.service';
import { IdentityAuditModule } from '../identity-audit/identity-audit.module';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserEmail,
      BuyerProfile,
      SellerProfile,
      ServiceProviderProfile,
      SellerProfileCategory,
      ServiceProviderProfileCategory,
      SellerProfileArchetype,
      ServiceProviderProfileArchetype,
      Category,
    ]),
    IdentityAuditModule,
    // Referral capture at registration (one-directional — referrals uses
    // entity-only User/UserEmail repos, never this module).
    ReferralsModule,
  ],
  providers: [UsersService, ArchetypeResolverService, ProfileMatchingService],
  controllers: [UsersController],
  exports: [UsersService, ArchetypeResolverService, ProfileMatchingService],
})
export class UsersModule {}
