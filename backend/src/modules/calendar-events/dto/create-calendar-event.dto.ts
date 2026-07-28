import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import {
  CALENDAR_EVENT_CATEGORIES,
  CALENDAR_EVENT_COLORS,
  CALENDAR_EVENT_REPEAT_RULES,
  CALENDAR_EVENT_STATUSES,
} from '../entities/calendar-event.entity';

/**
 * No userId field on purpose — the controller stamps req.user.id. The global
 * ValidationPipe runs forbidNonWhitelisted, so a client sending userId gets
 * a 400 rather than a silently-ignored field.
 */
export class CreateCalendarEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, { message: 'startTime must be HH:MM' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, { message: 'endTime must be HH:MM' })
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsIn(CALENDAR_EVENT_CATEGORIES as unknown as string[])
  category?: string;

  @IsOptional()
  @IsIn(CALENDAR_EVENT_COLORS as unknown as string[])
  color?: string;

  @IsOptional()
  @IsIn(CALENDAR_EVENT_REPEAT_RULES as unknown as string[])
  repeatRule?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10080)
  reminderOffsetMinutes?: number;

  @IsOptional()
  @IsIn(CALENDAR_EVENT_STATUSES as unknown as string[])
  status?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
