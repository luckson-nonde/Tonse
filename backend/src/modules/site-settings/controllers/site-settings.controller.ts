import { Controller, Get } from '@nestjs/common';
import { SiteSettingsService } from '../site-settings.service';

/**
 * Public, unauthenticated read of platform-wide site settings. Must stay
 * guard-free: the /discover landing page needs to know whether it's turned
 * on BEFORE the visitor has a session (same reasoning as
 * CategoriesController.getStatus()).
 */
@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @Get()
  async getSettings() {
    return this.siteSettingsService.getPublicSettings();
  }
}
