import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserConsent } from './entities/user-consent.entity';
import { ConsentsService } from './consents.service';
import { ConsentsController } from './consents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserConsent])],
  controllers: [ConsentsController],
  providers: [ConsentsService],
  exports: [ConsentsService],
})
export class ConsentsModule {}
