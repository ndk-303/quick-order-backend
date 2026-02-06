import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

// DTO for requesting OTP (Step 1 of password reset flow)
export class RequestOtpDto {
    @ApiProperty({
        description: 'Số điện thoại đã đăng ký',
        example: '0901234567',
    })
    @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
    phoneNumber: string;
}

// DTO for verifying OTP and resetting password (Step 2 of password reset flow)
export class VerifyOtpDto {
    @ApiProperty({
        description: 'Số điện thoại đã đăng ký',
        example: '0901234567',
    })
    @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
    phoneNumber: string;

    @ApiProperty({
        description: 'Mã OTP 6 chữ số',
        example: '123456',
        minLength: 6,
        maxLength: 6,
    })
    @IsNotEmpty({ message: 'Mã OTP không được để trống' })
    otp: string;

    @ApiProperty({
        description: 'Mật khẩu mới',
        example: 'NewPassword123',
        minLength: 6,
    })
    @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    newPassword: string;
}
