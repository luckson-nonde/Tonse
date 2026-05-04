import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * Body for PATCH /team/members/:id.
 *
 * Every field is optional — owners can edit any subset (e.g. just the
 * permissions, just the assignedArchetype, etc.). Password reset is
 * separate (TODO: dedicated endpoint) so this DTO doesn't take one.
 */
export class UpdateTeamMemberDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsString()
  assignedArchetype?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /**
   * Promote this staff member to department head for their
   * assignedArchetype. False (or omitted) demotes them. The team
   * service enforces the (parentProviderId, assignedArchetype)
   * uniqueness — only one head per department.
   */
  @IsOptional()
  @IsBoolean()
  isDepartmentHead?: boolean;

  /**
   * Autonomy mode for the department head. Required when
   * isDepartmentHead is set to true. INDEPENDENT auto-flips
   * canMoveFinance true; MANAGED keeps it false.
   */
  @IsOptional()
  @IsIn(['INDEPENDENT', 'MANAGED'])
  departmentAutonomy?: 'INDEPENDENT' | 'MANAGED';
}
