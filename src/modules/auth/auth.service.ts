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

    const payload = {
      sub: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.signAsync(payload),
      message: 'Đăng nhập thành công',
    };
  }
}
