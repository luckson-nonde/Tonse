import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ALL_ADMIN_PERMISSIONS } from '../../auth/constants/admin-permissions';

export class UpdateAdminManagerDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ALL_ADMIN_PERMISSIONS, { each: true })
  @IsOptional()
  permissions?: string[];

  /** Disable a manager without deleting the account. */
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
