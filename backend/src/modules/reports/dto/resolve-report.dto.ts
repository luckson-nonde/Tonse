import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ResolveReportDto {
  @IsEnum(['RESOLVED', 'DISMISSED'])
  status: string;

  @IsString()
  @IsOptional()
  resolutionNote?: string;
}
