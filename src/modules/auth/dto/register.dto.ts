import { IsNotEmpty, IsString, MinLength, IsPhoneNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Số điện thoại (định dạng Việt Nam)',
    example: '0901234567',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @IsPhoneNumber('VN')
  phoneNumber: string;

  @ApiProperty({
    description: 'Mật khẩu (tối thiểu 6 ký tự)',
    example: 'password123',
    minLength: 6,
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Họ và tên đầy đủ',
    example: 'Nguyễn Văn A',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiPropertyOptional({
    description: 'Địa chỉ (tùy chọn)',
    example: '123 Nguyễn Huệ, Quận 1, TP.HCM',
    type: String,
  })
  @IsOptional()
  @IsString()
  address?: string;
}
