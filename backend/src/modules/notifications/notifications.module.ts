import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { Inquiry } from '../inquiries/entities/inquiry.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './controllers/notifications.controller';

/**
 * Uber-dispatch notification hub: durable rows + live SSE fan-out.
 * Imports the Inquiry ENTITY only (buyerId lookups for accept telemetry) —
 * importing InquiriesModule would be circular, since InquiriesModule imports
 * this module to dispatch NEW_LEAD events.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Notification, Inquiry])],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
