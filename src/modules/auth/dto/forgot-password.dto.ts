import { IsNotEmpty, MinLength } from 'class-validator';

export class ForgotPasswordDto {
    @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
    phoneNumber: string;

    @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    newPassword: string;
}
