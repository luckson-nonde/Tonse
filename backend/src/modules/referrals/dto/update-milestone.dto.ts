import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

/** All-optional twin of CreateMilestoneDto (repo has no @nestjs/mapped-types). */
export class UpdateMilestoneDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  title?: string;

  @IsEnum(['inquiry', 'trade_complete'])
  @IsOptional()
  targetStage?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  requiredCount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  equitySharesReward?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
