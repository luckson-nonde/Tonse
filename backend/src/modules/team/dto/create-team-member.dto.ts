import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * Body for POST /team/members.
 *
 * The parent provider (caller) is taken from the JWT — never trusted
 * from the body. Password is optional; if omitted the controller
 * generates one and returns it once in the response (the staff member
 * uses it once, then changes it via mustChangePassword).
 */
export class CreateTeamMemberDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  /**
   * Optional — the archetype this staff member is restricted to in the
   * variant-aware leads view. NULL = no restriction (sees everything
   * the parent's seller_profile matches).
   */
  @IsOptional()
  @IsString()
  assignedArchetype?: string;
}
