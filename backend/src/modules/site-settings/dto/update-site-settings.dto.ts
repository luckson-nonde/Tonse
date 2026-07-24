import { IsOptional, IsBoolean } from 'class-validator';

/** Admin partial update — only the fields present are changed. */
export class UpdateSiteSettingsDto {
  @IsOptional()
  @IsBoolean()
  landingPageEnabled?: boolean;
}
