import { Type } from 'class-transformer';
import { Allow, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

/**
 * Browser PushSubscriptionJSON shape: { endpoint, expirationTime, keys }.
 *
 * `keys` MUST be a declared nested class with @ValidateNested + @Type — the
 * global ValidationPipe ({ whitelist: true, forbidNonWhitelisted: true }) in
 * main.ts silently strips un-classed nested objects, which would drop
 * p256dh/auth and break encryption. (Known repo gotcha — see promoter-signup.dto.)
 */
export class PushSubscriptionKeysDto {
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  auth: string;
}

export class PushSubscribeDto {
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  /**
   * Browsers always include this in toJSON() (usually null). Not stored —
   * whitelisted only so forbidNonWhitelisted doesn't 400 every real
   * subscription attempt.
   */
  @Allow()
  expirationTime?: number | null;

  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys: PushSubscriptionKeysDto;
}
