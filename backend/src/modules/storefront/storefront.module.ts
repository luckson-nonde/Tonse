import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromoTile } from './entities/promo-tile.entity';
import { StorefrontService } from './storefront.service';
import { StorefrontController } from './storefront.controller';

/**
 * Read-mostly module: it owns promo tiles and composes the public landing-page
 * feed out of them plus the products/categories/profiles tables.
 *
 * Imports nothing but its own repository — the category and profile joins go
 * through @InjectDataSource raw SQL, which needs no module wiring (same as
 * ShopsModule, which touches six tables it never imports). ProductsModule is
 * deliberately NOT imported: it drags LedgerModule + NotificationsModule along
 * for a module that only reads, and its findAll() filters on the free-text
 * products.category column, which means something different here.
 *
 * AdminModule imports this one-directionally, exactly as it does AdsModule.
 */
@Module({
  imports: [TypeOrmModule.forFeature([PromoTile])],
  providers: [StorefrontService],
  controllers: [StorefrontController],
  exports: [StorefrontService],
})
export class StorefrontModule {}
