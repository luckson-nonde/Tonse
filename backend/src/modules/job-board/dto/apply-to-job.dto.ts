import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JOB_RATE_UNITS } from '../entities/job-posting.entity';

export class JobApplicationAttachmentDto {
  /** The posting requirement this file answers, or "Supporting document". */
  @IsString()
  @Length(1, 120)
  label: string;

  /** A `/files/secure/...` path returned by POST /files/upload. Constrained
   *  so an application can't smuggle in an arbitrary external link that the
   *  poster would then be invited to click. */
  @IsString()
  @Matches(/\/files\/secure\/[A-Za-z0-9._-]+$/, {
    message: 'attachment url must be an uploaded secure file path',
  })
  url: string;
}

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

  /** Evidence against the posting's requirements. @ValidateNested + @Type are
   *  REQUIRED here — without them the global whitelisting ValidationPipe
   *  cannot descend into the array and silently blanks every element. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => JobApplicationAttachmentDto)
  attachments?: JobApplicationAttachmentDto[];
}
