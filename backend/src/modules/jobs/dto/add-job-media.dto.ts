import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddJobMediaDto {
  @IsIn(['BEFORE', 'AFTER'])
  phase: 'BEFORE' | 'AFTER';

  @IsIn(['IMAGE', 'VIDEO'])
  mediaType: 'IMAGE' | 'VIDEO';

  /** URL returned by POST /files/upload?category=job-evidence. */
  @IsString()
  @MaxLength(500)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
