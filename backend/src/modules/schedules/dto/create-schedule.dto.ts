import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsJSON,
  IsDateString,
  IsEnum,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateScheduleDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  date: Date;

  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, { message: 'startTime must be in HH:MM format' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, { message: 'endTime must be in HH:MM format' })
  endTime?: string;

  @IsOptional()
  @IsEnum(['DELIVERY', 'MEETING', 'SERVICE', 'REMINDER', 'OTHER'])
  type?: string = 'OTHER';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsEnum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'])
  status?: string = 'PENDING';

  @IsOptional()
  @IsJSON()
  metadata?: Record<string, any>;
}
