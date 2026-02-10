import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsPhoneNumber, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

// DTO for requesting OTP (Step 1 of password reset flow)
export class RequestOtpDto {
    @ApiProperty({
        description: 'Số điện thoại đã đăng ký',
        example: '0901234567',
    })
    @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ (ví dụ: 0901234567)' })
    @Matches(/^\S*$/, { message: 'Số điện thoại không được chứa khoảng trắng' })
    @Transform(({ value }) => value?.trim())
    @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
    phoneNumber: string;
}

// DTO for verifying OTP and resetting password (Step 2 of password reset flow)
export class VerifyOtpDto {
    @ApiProperty({
        description: 'Số điện thoại đã đăng ký',
        example: '0901234567',
    })
    @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ (ví dụ: 0901234567)' })
    @Matches(/^\S*$/, { message: 'Số điện thoại không được chứa khoảng trắng' })
    @Transform(({ value }) => value?.trim())
    @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
    phoneNumber: string;

    @ApiProperty({
        description: 'Mã OTP 6 chữ số',
        example: '123456',
        minLength: 6,
        maxLength: 6,
    })
    @IsNotEmpty({ message: 'Mã OTP không được để trống' })
    @Length(6, 6, { message: 'Mã OTP phải có 6 chữ số' })
    otp: string;

    @ApiProperty({
        description: 'Mật khẩu mới',
        example: 'NewPassword123',
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
    newPassword: string;
}
