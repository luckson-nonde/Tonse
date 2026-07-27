import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsJSON,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Nested tasks/visits need real validated classes — the global ValidationPipe
 * runs whitelist:true + forbidNonWhitelisted:true, which strips/rejects every
 * key of a nested object that isn't decorated (known repo gotcha — see
 * update-billing-settings.dto / push-subscribe.dto).
 */
export class CarePlanTaskDto {
  @IsString()
  @MaxLength(64)
  id: string;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  frequency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}

export class CarePlanVisitDto {
  @IsString()
  @MaxLength(64)
  id: string;

  /** yyyy-MM-dd */
  @IsString()
  @MaxLength(10)
  date: string;

  /** HH:mm */
  @IsOptional()
  @IsString()
  @MaxLength(5)
  startTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  endTime?: string;

  @IsIn(['SCHEDULED', 'COMPLETED', 'CANCELLED'])
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

/** Tasks/visits arrive as full-array replacements — the plan is small and the
 *  My Clients view always holds the whole thing. */
export class UpdateCarePlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  clientName?: string;

  /** Free-form (keys come from the category form schema), so it travels as a
   *  JSON string — same convention as Inquiry.attributes — because the
   *  whitelist pipe would empty an undecorated plain object. */
  @IsOptional()
  @IsJSON()
  careNeeds?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CarePlanTaskDto)
  tasks?: CarePlanTaskDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CarePlanVisitDto)
  visits?: CarePlanVisitDto[];

  @IsOptional()
  @IsIn(['PER_VISIT', 'WEEKLY', 'MONTHLY'])
  paymentModel?: 'PER_VISIT' | 'WEEKLY' | 'MONTHLY';

  @IsOptional()
  @IsNumber()
  @Min(0)
  rate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'PAUSED', 'ENDED'])
  status?: 'ACTIVE' | 'PAUSED' | 'ENDED';

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
