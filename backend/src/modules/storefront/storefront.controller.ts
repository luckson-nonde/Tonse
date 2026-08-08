import { Controller, Get, Query } from '@nestjs/common';
import {
  StorefrontService,
  StorefrontHome,
  StorefrontProductsPage,
} from './storefront.service';

/**
 * Public storefront feed for the `/discover` landing page.
 *
 * Deliberately unauthenticated, like `GET /ads/active` and `GET /site-settings`
 * — the landing page is what a visitor sees before any session exists. Admin
 * writes live on AdminController instead (undecorated ⇒ primary-admin-only).
 */
@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefront: StorefrontService) {}

  @Get('home')
  async home(): Promise<StorefrontHome> {
    return this.storefront.getHome();
  }

  /** Paginated products for the category-driven grid. `category` is a master
   *  category id (resolved via seller subscriptions, not the free-text
   *  products.category column); omitted → all active products. */
  @Get('products')
  async products(@Query() query: any): Promise<StorefrontProductsPage> {
    return this.storefront.getProducts({
      category: query.category,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    });
  }
}
