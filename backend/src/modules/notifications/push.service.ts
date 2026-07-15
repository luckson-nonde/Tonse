import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from './entities/push-subscription.entity';
import { PushSubscribeDto } from './dto/push-subscribe.dto';

export interface WebPushPayload {
  title: string;
  body: string;
  /** Route the SW navigates to on notification click. */
  url: string;
  tag?: string;
  icon?: string;
}

/**
 * Web Push delivery — isolates the `web-push` SDK from NotificationsService.
 *
 * Delivery is best-effort and NEVER throws into callers: notifyUsers() fires
 * sendToUser() without awaiting so a slow/unreachable push endpoint can't add
 * latency to the live in-app dispatch write. Expired subscriptions (404/410)
 * are self-healed by deletion.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly enabled: boolean;

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subsRepo: Repository<PushSubscription>,
    private readonly configService: ConfigService,
  ) {
    const publicKey = this.configService.get<string>('webpush.publicKey');
    const privateKey = this.configService.get<string>('webpush.privateKey');
    const subject = this.configService.get<string>('webpush.subject');
    this.enabled = Boolean(publicKey && privateKey);
    if (this.enabled) {
      webpush.setVapidDetails(subject!, publicKey!, privateKey!);
      this.logger.log('Web Push enabled (VAPID configured).');
    } else {
      this.logger.warn('Web Push disabled: WEB_PUSH_PUBLIC_KEY/PRIVATE_KEY not set.');
    }
  }

  /** Idempotent per-device upsert (keyed on the unique endpoint). */
  async save(userId: string, dto: PushSubscribeDto, userAgent?: string) {
    await this.subsRepo.upsert(
      {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: userAgent ?? null,
      },
      ['endpoint'],
    );
    return { ok: true };
  }

  async remove(userId: string, endpoint: string) {
    if (!endpoint) return { ok: true };
    await this.subsRepo.delete({ userId, endpoint });
    return { ok: true };
  }

  /**
   * Fan a push out to every subscription a user has. Best-effort: swallows all
   * errors, self-heals expired subscriptions. Never rejects.
   */
  async sendToUser(userId: string, payload: WebPushPayload): Promise<void> {
    if (!this.enabled) return;
    const subs = await this.subsRepo.find({ where: { userId } });
    if (subs.length === 0) return;

    const body = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
          );
        } catch (err: any) {
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            // Subscription expired/unsubscribed — forget it.
            await this.subsRepo.delete({ id: sub.id }).catch(() => undefined);
          } else {
            this.logger.warn(
              `push send failed user=${userId} endpoint=${String(sub.endpoint).slice(0, 40)}…: ${err?.message}`,
            );
          }
        }
      }),
    );
  }
}
