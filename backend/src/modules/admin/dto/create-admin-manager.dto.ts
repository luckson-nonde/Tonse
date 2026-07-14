import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ALL_ADMIN_PERMISSIONS } from '../../auth/constants/admin-permissions';

export class CreateAdminManagerDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  /** Non-empty — a manager with zero permissions can't do anything. */
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ALL_ADMIN_PERMISSIONS, { each: true })
  permissions: string[];
}
