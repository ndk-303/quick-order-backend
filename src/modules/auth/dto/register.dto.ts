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
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @Transform(({ value }) => value?.trim())
  @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ (ví dụ: 0901234567)' })
  phoneNumber: string;

  @ApiProperty({
    description: 'Mật khẩu (tối thiểu 6 ký tự, tối đa 50 ký tự)',
    example: 'SecurePass123',
    minLength: 6,
    maxLength: 50,
    type: String,
  })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @MaxLength(50, { message: 'Mật khẩu không được vượt quá 50 ký tự' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
    message: 'Mật khẩu phải chứa ít nhất một chữ cái và một chữ số',
  })
  @Transform(({ value }) => value?.trim())
  password: string;

  @ApiProperty({
    description: 'Họ và tên đầy đủ (2-100 ký tự)',
    example: 'Nguyễn Văn A',
    minLength: 2,
    maxLength: 100,
    type: String,
  })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  @Transform(({ value }) => value?.trim())
  @MinLength(2, { message: 'Họ và tên phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'Họ và tên không được vượt quá 100 ký tự' })
  @Matches(/^[a-zA-ZÀ-ỹ\s]+$/, {
    message: 'Họ và tên chỉ được chứa chữ cái và khoảng trắng',
  })
  fullName: string;

  @ApiPropertyOptional({
    description: 'Địa chỉ (tùy chọn, tối đa 200 ký tự)',
    example: '123 Nguyễn Huệ, Quận 1, TP.HCM',
    maxLength: 200,
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Địa chỉ phải là chuỗi ký tự' })
  @Transform(({ value }) => value?.trim())
  @MaxLength(200, { message: 'Địa chỉ không được vượt quá 200 ký tự' })
  @MinLength(5, { message: 'Địa chỉ phải có ít nhất 5 ký tự nếu được cung cấp' })
  address?: string;
}
