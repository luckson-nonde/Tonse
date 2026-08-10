import { IsDateString, IsIn, IsNumber, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { JOB_RATE_UNITS } from '../entities/job-posting.entity';

export class ApplyToJobDto {
  @IsString()
  @MinLength(10)
  coverMessage: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  expectedRate: number;

  @IsIn(JOB_RATE_UNITS as unknown as string[])
  rateUnit: string;

  @IsDateString()
  availabilityDate: string;
}
