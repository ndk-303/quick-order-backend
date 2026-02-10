import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { comparePassword, hashPassword } from 'src/common/utils/password.util';
import { LoginDto } from './dto/login.dto';
import { Payload } from 'src/common/interfaces/payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
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

    console.log(`[OTP] Registration OTP for ${phoneNumber}: ${otp}`);

    return {
      message: 'Đăng ký thành công. Vui lòng kiểm tra mã OTP để kích hoạt tài khoản.',
      otp: otp,
      _id: newUser._id,
    };
  }

  async login(loginDto: LoginDto) {
    const { phoneNumber, password } = loginDto;

    const user = await this.userModel
      .findOne({ phoneNumber })
      .select('_id fullName email phoneNumber password role restaurantId authProviders isActive');

    if (!user) {
      throw new UnauthorizedException('Số điện thoại hoặc mật khẩu không đúng');
    }

    if (!user.password) {
      throw new UnauthorizedException('Tài khoản này sử dụng phương thức đăng nhập khác');
    }

    const checkedPassword = await comparePassword(password, user.password);
    if (!checkedPassword) {
      throw new UnauthorizedException('Số điện thoại hoặc mật khẩu không đúng');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản chưa được kích hoạt. Vui lòng xác thực OTP.');
    }

    const { accessToken, refreshToken } = this.generateTokens(user);

    await this.userModel.updateOne(
      { _id: user._id },
      { refreshToken: refreshToken },
    );

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        authProviders: user.authProviders,
      },
      message: 'Đăng nhập thành công',
    };
  }

  async logout(userId: string) {
    await this.userModel.updateOne({ _id: userId }, { refreshToken: null });

    return {
      message: 'Đăng xuất thành công',
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload: Payload = this.jwtService.verify(refreshToken);

      const user = await this.userModel
        .findById(payload.sub)
        .select('+refreshToken fullName email phoneNumber authProviders');

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      const tokens = this.generateTokens(user);

      await this.userModel.updateOne(
        { _id: user._id },
        { refreshToken: tokens.refreshToken },
      );

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          authProviders: user.authProviders,
        },
      };
    } catch {
      throw new UnauthorizedException('Refresh token hết hạn');
    }
  }

  private generateTokens(user: UserDocument) {
    console.log(user);
    const payload = {
      sub: user._id.toString(),
      role: user.role,
      restaurantId: user?.restaurantId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '15d',
    });

    return { accessToken, refreshToken };
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

    console.log(`[OTP] Resend verification OTP for ${phoneNumber}: ${otp}`);

    return {
      message: 'Mã OTP đã được gửi lại',
      otp: otp,
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

    console.log(`[OTP] Password reset OTP for ${phoneNumber}: ${otp}`);

    return {
      message: 'Mã OTP đã được gửi đến số điện thoại của bạn',
      otp: otp,
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

    // Reset password and clear OTP
    await this.userModel.updateOne(
      { _id: user._id },
      {
        password: hashedPassword,
        refreshToken: null,
        verificationOtp: null,
        otpExpiry: null,
      },
    );

    return { message: 'Đặt lại mật khẩu thành công' };
  }

  async googleLogin(googleUser: any) {
    try {
      console.log('Google login attempt for:', googleUser.email);

      // Find user by googleId or email
      let user = await this.userModel.findOne({
        $or: [
          { googleId: googleUser.id },
          { email: googleUser.email },
        ],
      });

      if (!user) {
        console.log('Creating new user from Google profile');
        // Create new user from Google profile
        user = await this.userModel.create({
          googleId: googleUser.id,
          email: googleUser.email,
          fullName: `${googleUser.firstName} ${googleUser.lastName}`.trim() || googleUser.email,
          authProviders: ['google'],
          address: '',
        });
      } else if (!user.googleId) {
        // Link Google account to existing user
        console.log('Linking Google account to existing user');
        user.googleId = googleUser.id;
        if (!user.email) {
          user.email = googleUser.email;
        }
        if (!user.authProviders.includes('google')) {
          user.authProviders.push('google');
        }
        await user.save();
      }

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Update refresh token
      await this.userModel.updateOne(
        { _id: user._id },
        { refreshToken: tokens.refreshToken },
      );

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          authProviders: user.authProviders,
        },
      };
    } catch (error) {
      console.error('Google login error:', error);
      throw new BadRequestException('Đăng nhập Google thất bại: ' + error.message);
    }
  }
}
