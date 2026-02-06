import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Length } from 'class-validator';

export class VerifyAccountDto {
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
    @Length(6, 6, { message: 'Mã OTP phải có 6 chữ số' })
    otp: string;
}

export class ResendOtpDto {
    @ApiProperty({
        description: 'Số điện thoại cần gửi lại OTP',
        example: '0901234567',
    })
    @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
    phoneNumber: string;
}
