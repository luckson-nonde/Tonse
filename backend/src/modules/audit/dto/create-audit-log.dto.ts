import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateAuditLogDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  /** Human-readable actor. Usually auto-filled from the request audit context. */
  @IsOptional()
  @IsString()
  actorLabel?: string;

  @IsOptional()
  @IsUUID()
  providerId?: string;

  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsOptional()
  @IsString()
  staffName?: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsString()
  targetTitle?: string;

  @IsOptional()
  @IsString()
  buyerName?: string;

  @IsOptional()
  amount?: number;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsString()
  changes?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
