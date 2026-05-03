import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserEmail } from './entities/user-email.entity';
import { IdentityAudit } from './entities/identity-audit.entity';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserEmail,
      IdentityAudit,
      BuyerProfile,
      SellerProfile,
      ServiceProviderProfile,
      SellerProfileCategory,
      ServiceProviderProfileCategory,
      SellerProfileArchetype,
      ServiceProviderProfileArchetype,
      Category,
    ]),
  ],
  providers: [UsersService, ArchetypeResolverService],
  controllers: [UsersController],
  exports: [UsersService, ArchetypeResolverService],
})
export class UsersModule {}
