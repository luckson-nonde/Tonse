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

export class CreateMilestoneDto {
  @IsString()
  @MinLength(3)
  title: string;

  /** 'registration' is deliberately not a target — trivially true. */
  @IsEnum(['inquiry', 'trade_complete'])
  targetStage: string;

  @IsInt()
  @Min(1)
  requiredCount: number;

  @IsNumber()
  @Min(0)
  equitySharesReward: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
