import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteSettings } from './entities/site-settings.entity';
import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto';

@Injectable()
export class SiteSettingsService {
  constructor(
    @InjectRepository(SiteSettings)
    private readonly settingsRepository: Repository<SiteSettings>,
  ) {}

  async getOrCreateSettings(): Promise<SiteSettings> {
    const existing = await this.settingsRepository.find({ take: 1 });
    if (existing.length > 0) return existing[0];
    return this.settingsRepository.save(
      this.settingsRepository.create({ landingPageEnabled: false }),
    );
  }

  /** Shape readable by anyone, including unauthenticated visitors. */
  async getPublicSettings() {
    const settings = await this.getOrCreateSettings();
    return { landingPageEnabled: settings.landingPageEnabled };
  }

  async updateSettings(dto: UpdateSiteSettingsDto): Promise<SiteSettings> {
    const settings = await this.getOrCreateSettings();
    if (dto.landingPageEnabled !== undefined) settings.landingPageEnabled = dto.landingPageEnabled;
    return this.settingsRepository.save(settings);
  }
}
