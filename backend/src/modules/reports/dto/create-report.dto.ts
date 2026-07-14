import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateReportDto {
  @IsUUID()
  reportedUserId: string;

  @IsEnum([
    'SCAM_FRAUD',
    'ABUSIVE_BEHAVIOR',
    'NO_SHOW',
    'FAKE_LISTING',
    'PAYMENT_DISPUTE',
    'OTHER',
  ])
  category: string;

  @IsString()
  @MinLength(5)
  description: string;

  @IsEnum(['INQUIRY', 'QUOTE', 'ORDER'])
  @IsOptional()
  contextType?: string;

  @IsUUID()
  @IsOptional()
  contextId?: string;
}
