import {
  IsArray,
  IsBoolean,
  IsEmail,
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
}
