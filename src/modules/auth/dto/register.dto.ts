import { IsNotEmpty } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  phoneNumber: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  fullName: string;

  address?: string;
}
