import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Model } from 'mongoose';
import { RegisterDto } from './dto/register.dto';
import { comparePassword, hashPassword } from 'src/common/utils/password.util';
import { LoginDto } from './dto/login.dto';

export interface SessionUser {
  userId: string;
  role: string;
  restaurantId?: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) { }

  async register(registerDto: RegisterDto) {
    const { phoneNumber, password, fullName, address } = registerDto;
    const checkedAccount = await this.userModel.findOne({ phoneNumber });

    if (checkedAccount) {
      throw new BadRequestException('Số điện thoại đã tồn tại');
    }

    const hashedPassword = await hashPassword(password);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    const newUser = await this.userModel.create({
      phoneNumber,
      password: hashedPassword,
      fullName,
      address: address ?? '',
      authProviders: ['phone'],
      verificationOtp: otp,
      otpExpiry: otpExpiry,
    });

    return {
      message: 'Đăng ký thành công. Vui lòng kiểm tra mã OTP để kích hoạt tài khoản.',
      _id: newUser._id,
      otp: otp,
    };
  }

  async login(loginDto: LoginDto): Promise<{ user: SessionUser & Record<string, unknown> }> {
    const { phoneNumber, password } = loginDto;
    const user = await this.userModel
      .findOne({ phoneNumber })
      .select('_id fullName email phoneNumber password role restaurantId authProviders isActive');

    if (!user) {
      throw new UnauthorizedException('Số điện thoại không đúng');
    }

    if (!user.password) {
      throw new UnauthorizedException('Tài khoản này sử dụng phương thức đăng nhập khác');
    }

    const checkedPassword = await comparePassword(password, user.password);
    if (!checkedPassword) {
      throw new UnauthorizedException('Mật khẩu không đúng');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản chưa được kích hoạt. Vui lòng xác thực OTP.');
    }

    return {
      user: {
        userId: user._id.toString(),
        role: user.role,
        restaurantId: user.restaurantId?.toString() ?? null,
        // Extra info for response
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    };
  }

  async logout() {
    return {
      message: 'Đăng xuất thành công',
    };
  }

  async verifyAccount(phoneNumber: string, otp: string) {
    const user = await this.userModel
      .findOne({ phoneNumber })
      .select('+verificationOtp +otpExpiry');

    if (!user) {
      throw new BadRequestException('Số điện thoại không tồn tại');
    }

    if (user.isActive) {
      throw new BadRequestException('Tài khoản đã được kích hoạt');
    }

    if (!user.verificationOtp || !user.otpExpiry) {
      throw new BadRequestException('Không tìm thấy mã OTP. Vui lòng yêu cầu gửi lại.');
    }

    if (new Date() > user.otpExpiry) {
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.');
    }

    if (user.verificationOtp !== otp) {
      throw new BadRequestException('Mã OTP không đúng');
    }

    await this.userModel.updateOne(
      { _id: user._id },
      {
        isActive: true,
        verificationOtp: null,
        otpExpiry: null,
      },
    );

    return { message: 'Kích hoạt tài khoản thành công' };
  }

  async resendVerificationOtp(phoneNumber: string) {
    const user = await this.userModel.findOne({ phoneNumber });

    if (!user) {
      throw new BadRequestException('Số điện thoại không tồn tại');
    }

    if (user.isActive) {
      throw new BadRequestException('Tài khoản đã được kích hoạt');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.userModel.updateOne(
      { _id: user._id },
      {
        verificationOtp: otp,
        otpExpiry: otpExpiry,
      },
    );

    this.logger.debug(`[OTP] Resend verification OTP for ${phoneNumber}: ${otp}`);

    return {
      message: 'Mã OTP đã được gửi lại',
    };
  }

  async requestOtp(phoneNumber: string) {
    const user = await this.userModel.findOne({ phoneNumber });

    if (!user) {
      throw new BadRequestException('Số điện thoại không tồn tại');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.userModel.updateOne(
      { _id: user._id },
      {
        verificationOtp: otp,
        otpExpiry: otpExpiry,
      },
    );

    this.logger.debug(`[OTP] Password reset OTP for ${phoneNumber}: ${otp}`);

    return {
      message: 'Mã OTP đã được gửi đến số điện thoại của bạn',
    };
  }

  async verifyOtpAndResetPassword(
    phoneNumber: string,
    otp: string,
    newPassword: string,
  ) {
    const user = await this.userModel
      .findOne({ phoneNumber })
      .select('+verificationOtp +otpExpiry');

    if (!user) {
      throw new BadRequestException('Số điện thoại không tồn tại');
    }

    if (!user.verificationOtp || !user.otpExpiry) {
      throw new BadRequestException('Không tìm thấy mã OTP. Vui lòng yêu cầu gửi lại.');
    }

    if (new Date() > user.otpExpiry) {
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.');
    }
    if (user.verificationOtp !== otp) {
      throw new BadRequestException('Mã OTP không đúng');
    }

    const hashedPassword = await hashPassword(newPassword);

    await this.userModel.updateOne(
      { _id: user._id },
      {
        password: hashedPassword,
        verificationOtp: null,
        otpExpiry: null,
      },
    );

    return { message: 'Đặt lại mật khẩu thành công' };
  }
}
