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
  ValidateIf,
} from 'class-validator';
import {
  CALENDAR_EVENT_CATEGORIES,
  CALENDAR_EVENT_COLORS,
  CALENDAR_EVENT_REPEAT_RULES,
  CALENDAR_EVENT_STATUSES,
} from '../entities/calendar-event.entity';

/**
 * All fields optional (no PartialType helper in this repo — handwritten,
 * matching care-plans' update DTO style). Nullable clears: startTime,
 * endTime, location, color and reminderOffsetMinutes accept explicit null
 * to unset a previously stored value.
 */
export class UpdateCalendarEventDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @ValidateIf((o) => o.startTime !== null && o.startTime !== undefined)
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, { message: 'startTime must be HH:MM' })
  startTime?: string | null;

  @ValidateIf((o) => o.endTime !== null && o.endTime !== undefined)
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, { message: 'endTime must be HH:MM' })
  endTime?: string | null;

  @ValidateIf((o) => o.location !== null && o.location !== undefined)
  @IsString()
  @MaxLength(255)
  location?: string | null;

  @IsOptional()
  @IsIn(CALENDAR_EVENT_CATEGORIES as unknown as string[])
  category?: string;

  @ValidateIf((o) => o.color !== null && o.color !== undefined)
  @IsIn(CALENDAR_EVENT_COLORS as unknown as string[])
  color?: string | null;

  @IsOptional()
  @IsIn(CALENDAR_EVENT_REPEAT_RULES as unknown as string[])
  repeatRule?: string;

  @ValidateIf((o) => o.reminderOffsetMinutes !== null && o.reminderOffsetMinutes !== undefined)
  @IsInt()
  @Min(0)
  @Max(10080)
  reminderOffsetMinutes?: number | null;

  @IsOptional()
  @IsIn(CALENDAR_EVENT_STATUSES as unknown as string[])
  status?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
