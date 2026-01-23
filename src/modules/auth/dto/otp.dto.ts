import { IsNotEmpty, MinLength } from 'class-validator';

// DTO for requesting OTP (Step 1 of SMS flow)
export class RequestOtpDto {
    @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
    phoneNumber: string;
}

// DTO for verifying OTP and resetting password (Step 2 of SMS flow)
export class VerifyOtpDto {
    @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
    phoneNumber: string;

    @IsNotEmpty({ message: 'Mã OTP không được để trống' })
    otp: string;

    @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    newPassword: string;
}
