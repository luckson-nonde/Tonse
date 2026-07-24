import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteSettings } from './entities/site-settings.entity';
import { SiteSettingsService } from './site-settings.service';
import { SiteSettingsController } from './controllers/site-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SiteSettings])],
  providers: [SiteSettingsService],
  controllers: [SiteSettingsController],
  exports: [SiteSettingsService],
})
export class SiteSettingsModule {}
