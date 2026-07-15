import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { Inquiry } from '../inquiries/entities/inquiry.entity';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { NotificationsController } from './controllers/notifications.controller';

/**
 * Uber-dispatch notification hub: durable rows + live SSE fan-out.
 * Imports the Inquiry ENTITY only (buyerId lookups for accept telemetry) —
 * importing InquiriesModule would be circular, since InquiriesModule imports
 * this module to dispatch NEW_LEAD events.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Notification, PushSubscription, Inquiry])],
  providers: [NotificationsService, PushService],
  controllers: [NotificationsController],
  exports: [NotificationsService, PushService],
})
export class NotificationsModule {}
