import { Controller, Get } from '@nestjs/common';
import { StorefrontService, StorefrontHome } from './storefront.service';

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
}
