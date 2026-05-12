import { IsOptional, IsString, MaxLength, IsDateString, IsUrl } from 'class-validator';

export class CreatePortfolioItemDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  youtubeUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  eventName?: string;

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
