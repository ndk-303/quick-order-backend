import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { VerifyAccountDto, ResendOtpDto } from './dto/verify-account.dto';
import { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from '../../common/guards/local-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) { }

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(200)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async login(@Body() loginDto: LoginDto, @Req() request: any) {
    const user = request.user;

    // Chỉ trả về thông tin user (không trả token)
    return {
      message: 'Đăng nhập thành công',
      user: {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        restaurantId: user.restaurantId,
        authProviders: user.authProviders,
      },
    };
  }

  @Post('logout')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logout(@Req() request: any) {
    return new Promise((resolve, reject) => {
      request.logout((err: Error) => {
        if (err) {
          return reject(new BadRequestException('Đăng xuất thất bại'));
        }
        request.session.destroy((err2: Error) => {
          if (err2) {
            reject(new BadRequestException('Đăng xuất thất bại'));
          } else {
            resolve({ message: 'Đăng xuất thành công' });
          }
        });
      });
    });
  }

  @Public()
  @Post('request-otp')
  async requestOtp(@Body() body: RequestOtpDto) {
    return this.authService.requestOtp(body.phoneNumber);
  }

  @Public()
  @Post('verify-account')
  async verifyAccount(@Body() verifyAccountDto: VerifyAccountDto) {
    return this.authService.verifyAccount(
      verifyAccountDto.phoneNumber,
      verifyAccountDto.otp,
    );
  }

  @Public()
  @Post('forgot-password')
  async verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtpAndResetPassword(
      body.phoneNumber,
      body.otp,
      body.newPassword,
    );
  }
}
