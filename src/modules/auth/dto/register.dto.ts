import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsPhoneNumber,
  IsOptional,
  Matches
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({
    description: 'Số điện thoại (định dạng Việt Nam)',
    example: '0901234567',
    type: String,
  })
  @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ (ví dụ: 0901234567)' })
  @Matches(/^\S*$/, { message: 'Số điện thoại không được chứa khoảng trắng' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @Transform(({ value }) => value?.trim())
  phoneNumber: string;

  @ApiProperty({
    description: 'Mật khẩu (tối thiểu 6 ký tự, tối đa 50 ký tự)',
    example: 'SecurePass123',
    minLength: 6,
    maxLength: 50,
    type: String,
  })
  @MaxLength(50, { message: 'Mật khẩu không được vượt quá 50 ký tự' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
    message: 'Mật khẩu phải chứa ít nhất một chữ cái và một chữ số',
  })
  @Matches(/^\S+$/, { message: 'Mật khẩu không được chứa khoảng trắng hoặc ký tự đặc biệt' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @Transform(({ value }) => value?.trim())
  password: string;

  @ApiProperty({
    description: 'Họ và tên đầy đủ (2-100 ký tự)',
    example: 'Nguyễn Văn A',
    minLength: 2,
    maxLength: 100,
    type: String,
  })
  @MaxLength(100, { message: 'Họ và tên không được vượt quá 100 ký tự' })
  @MinLength(2, { message: 'Họ và tên phải có ít nhất 2 ký tự' })
  @Matches(/^[a-zA-ZÀ-ỹ ]+$/, {
    message: 'Họ và tên chỉ được chứa chữ cái và khoảng trắng',
  })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @Transform(({ value }) => value?.trim())
  fullName: string;

  @ApiPropertyOptional({
    description: 'Địa chỉ (tùy chọn, tối đa 200 ký tự)',
    example: '123 Nguyễn Huệ, Quận 1, TP.HCM',
    maxLength: 200,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Địa chỉ phải là chuỗi ký tự' })
  @MinLength(5, { message: 'Địa chỉ phải có ít nhất 5 ký tự nếu được cung cấp' })
  @MaxLength(200, { message: 'Địa chỉ không được vượt quá 200 ký tự' })
  @Matches(/^[a-zA-Z0-9À-ỹ ,.\-\/]+$/, {
    message: 'Địa chỉ chỉ được chứa chữ cái, số, khoảng trắng',
  })
  address?: string;
}
