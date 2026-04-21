import { IsString, IsEmail, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string; // Email address only for login

  @IsString()
  @MinLength(8)
  password: string;
}
