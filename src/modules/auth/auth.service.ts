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
  ) {}

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
    });

    return {
      message: 'Đăng ký thành công',
      _id: newUser._id,
    };
  }

  async login(loginDto: LoginDto) {
    const { phoneNumber, password } = loginDto;

    const user = await this.userModel.findOne({ phoneNumber });
    if (!user) {
      throw new UnauthorizedException('Sai số điện thoại');
    }

    const checkedPassword = await comparePassword(password, user.password);
    if (!checkedPassword) {
      throw new UnauthorizedException('Sai mật khẩu');
    }

    const { accessToken, refreshToken } = this.generateTokens(user);

    await this.userModel.updateOne(
      { _id: user._id },
      { refreshToken: refreshToken },
    );

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
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
        .select('+refreshToken');

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      const tokens = this.generateTokens(user);

      await this.userModel.updateOne(
        { _id: user._id },
        { refreshToken: tokens.refreshToken },
      );

      return tokens;
    } catch {
      throw new UnauthorizedException('Refresh token hết hạn');
    }
  }

  private generateTokens(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      role: user.role,
      restaurantId: user?.restaurantId,
    };

    console.log(payload.restaurantId);
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
}
