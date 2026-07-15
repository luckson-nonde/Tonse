import { IsString, IsOptional, MinLength } from 'class-validator';

/**
 * currentPassword is optional at the DTO level because the one-time forced
 * change (mustChangePassword=true, right after a temp-password login) is
 * exempt — see UsersService.changePassword. Every other call must supply it;
 * the service enforces that, not this DTO.
 */
export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @MinLength(8)
  password: string;
}
