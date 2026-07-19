import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class AssignTechnicianDto {
  /** Technician user id to assign — or null to unassign. */
  @IsOptional()
  @ValidateIf((o) => o.technicianId !== null)
  @IsUUID()
  technicianId?: string | null;
}
