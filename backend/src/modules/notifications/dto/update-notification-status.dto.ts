import { IsIn } from 'class-validator';

export class UpdateNotificationStatusDto {
  @IsIn(['ACKNOWLEDGED', 'DECLINED'])
  status: 'ACKNOWLEDGED' | 'DECLINED';
}
