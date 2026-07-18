import { IsIn } from 'class-validator';

export class SwitchRoleDto {
  @IsIn(['BUYER', 'SELLER', 'SERVICE_PROVIDER'])
  targetRole: 'BUYER' | 'SELLER' | 'SERVICE_PROVIDER';
}
