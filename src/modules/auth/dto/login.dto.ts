import { IsNotEmpty, IsString, MinLength, IsPhoneNumber, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({
    description: 'Số điện thoại đăng nhập',
    example: '0901234567',
    type: String,
  })
  @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ (ví dụ: 0901234567)' })
  @Matches(/^\S*$/, { message: 'Số điện thoại không được chứa khoảng trắng' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @Transform(({ value }) => value?.trim())
  phoneNumber: string;

  @ApiProperty({
    description: 'Mật khẩu (tối thiểu 6 ký tự)',
    example: 'password123',
    minLength: 6,
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
}
