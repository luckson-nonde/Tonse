import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class AdvanceLoanStageDto {
  // 'ACCEPTED' is deliberately excluded — that transition happens via the
  // normal quote-accept flow, not this endpoint (LoanService.advanceStage
  // rejects it too; this just fails validation earlier).
  @IsString()
  @IsNotEmpty()
  @IsIn(['CONTACTED', 'VERIFIED', 'DISBURSED', 'COMPLETED'])
  stage: string;
}
