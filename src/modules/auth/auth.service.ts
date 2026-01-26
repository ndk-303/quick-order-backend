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

    const newUser = await this.userModel.create({
      phoneNumber,
      password: hashedPassword,
      fullName,
      address: address ?? '',
      authProviders: ['phone'],
    });

    return {
      message: 'Đăng ký thành công',
      _id: newUser._id,
    };
  }

  async login(loginDto: LoginDto) {
    const { phoneNumber, password } = loginDto;

    const user = await this.userModel
      .findOne({ phoneNumber })
      .select('_id fullName email phoneNumber password role restaurantId authProviders');

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
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  // ===== FORGOT PASSWORD - Direct Reset (For Demo) =====
  async resetPassword(phoneNumber: string, newPassword: string) {
    const user = await this.userModel.findOne({ phoneNumber });

    if (!user) {
      throw new BadRequestException('Số điện thoại không tồn tại');
    }

    const hashedPassword = await hashPassword(newPassword);

    await this.userModel.updateOne(
      { _id: user._id },
      { password: hashedPassword, refreshToken: null }, // Clear refresh token for security
    );

    return { message: 'Đặt lại mật khẩu thành công' };
  }

  // ===== FORGOT PASSWORD - OTP Flow (For Production) =====
  // TODO: Implement SMS OTP service integration
  async requestPasswordResetOtp(phoneNumber: string) {
    const user = await this.userModel.findOne({ phoneNumber });

    if (!user) {
      throw new BadRequestException('Số điện thoại không tồn tại');
    }

    // TODO: Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // TODO: Save OTP to database or cache (Redis) with expiry (5 minutes)
    // Example: await this.cacheService.set(`otp:${phoneNumber}`, otp, 300);

    // TODO: Send OTP via SMS service (Twilio, AWS SNS, etc.)
    // Example: await this.smsService.sendOtp(phoneNumber, otp);

    // For now, just return success (in production, don't return OTP!)
    return {
      message: 'Mã OTP đã được gửi đến số điện thoại của bạn',
      // REMOVE THIS IN PRODUCTION:
      otp: otp, // Only for testing without real SMS
    };
  }

  async verifyOtpAndResetPassword(
    phoneNumber: string,
    otp: string,
    newPassword: string,
  ) {
    const user = await this.userModel.findOne({ phoneNumber });

    if (!user) {
      throw new BadRequestException('Số điện thoại không tồn tại');
    }

    // TODO: Verify OTP from cache/database
    // const cachedOtp = await this.cacheService.get(`otp:${phoneNumber}`);
    // if (!cachedOtp || cachedOtp !== otp) {
    //   throw new BadRequestException('Mã OTP không đúng hoặc đã hết hạn');
    // }

    // Temporary: Skip OTP verification for demo
    console.log(`[DEBUG] OTP verification skipped. Received OTP: ${otp}`);

    const hashedPassword = await hashPassword(newPassword);

    await this.userModel.updateOne(
      { _id: user._id },
      { password: hashedPassword, refreshToken: null },
    );

    // TODO: Delete used OTP from cache
    // await this.cacheService.delete(`otp:${phoneNumber}`);

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
