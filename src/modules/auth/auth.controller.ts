import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { VerifyAccountDto, ResendOtpDto } from './dto/verify-account.dto';
import { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) { }

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Đăng ký tài khoản mới',
    description: 'Tạo tài khoản người dùng mới với số điện thoại và mật khẩu. Tài khoản sẽ ở trạng thái chưa kích hoạt và OTP sẽ được gửi để xác thực.'
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Đăng ký thành công, OTP đã được gửi',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Đăng ký thành công. Vui lòng kiểm tra mã OTP để kích hoạt tài khoản.' },
        otp: { type: 'string', example: '123456', description: 'ONLY FOR TESTING - Remove in production' },
        _id: { type: 'string', example: '507f1f77bcf86cd799439011' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Số điện thoại đã tồn tại hoặc dữ liệu không hợp lệ',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Số điện thoại đã tồn tại' }
      }
    }
  })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Đăng nhập',
    description: 'Đăng nhập với số điện thoại và mật khẩu. Refresh token sẽ được set trong httpOnly cookie.'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công. Access token trả về trong response, refresh token trong cookie.',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          description: 'JWT access token (expires in 15 minutes)',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        user: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            phoneNumber: { type: 'string', example: '0901234567' },
            name: { type: 'string', example: 'Nguyễn Văn A' },
            role: { type: 'string', example: 'client' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Số điện thoại hoặc mật khẩu không đúng',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid credentials' }
      }
    }
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: any,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.login(loginDto);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    console.log("Access Token:", accessToken)
    return { accessToken, user };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() request: any,
    @Res({ passthrough: true }) response: any,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const refreshToken = request.cookies['refresh_token'];
    console.log(refreshToken);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const newTokens = await this.authService.refreshToken(refreshToken);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    response.cookie('refresh_token', newTokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: newTokens.accessToken, user: newTokens.user };
  }

  @Post('logout')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Đăng xuất',
    description: 'Clear refresh token cookie và đăng xuất người dùng'
  })
  @ApiResponse({
    status: 200,
    description: 'Đăng xuất thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logged out successfully' }
      }
    }
  })
  logout(@Res({ passthrough: true }) response: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    response.clearCookie('refresh_token');
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('request-otp')
  @ApiOperation({
    summary: 'Yêu cầu mã OTP',
    description: 'Gửi mã OTP đến số điện thoại để xác thực tài khoản hoặc đặt lại mật khẩu  '
  })
  @ApiBody({ type: RequestOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Mã OTP đã được gửi',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Mã OTP đã được gửi đến số điện thoại của bạn' },
        otp: { type: 'string', example: '123456', description: 'ONLY FOR TESTING - Remove in production' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Số điện thoại không tồn tại',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Số điện thoại không tồn tại' }
      }
    }
  })
  async requestOtp(@Body() body: RequestOtpDto) {
    return this.authService.requestOtp(body.phoneNumber);
  }

  @Public()
  @Post('verify-account')
  @ApiOperation({
    summary: 'Kích hoạt tài khoản',
    description: 'Xác thực mã OTP để kích hoạt tài khoản sau khi đăng ký'
  })
  @ApiBody({ type: VerifyAccountDto })
  @ApiResponse({
    status: 200,
    description: 'Kích hoạt tài khoản thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Kích hoạt tài khoản thành công' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Mã OTP không đúng hoặc đã hết hạn',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Mã OTP không đúng' }
      }
    }
  })
  async verifyAccount(@Body() verifyAccountDto: VerifyAccountDto) {
    return this.authService.verifyAccount(
      verifyAccountDto.phoneNumber,
      verifyAccountDto.otp,
    );
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Xác thực OTP và đặt lại mật khẩu',
    description: 'Xác thực mã OTP và đặt lại mật khẩu mới'
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Đặt lại mật khẩu thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Đặt lại mật khẩu thành công' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Mã OTP không đúng hoặc đã hết hạn',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Mã OTP không đúng' }
      }
    }
  })
  async verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtpAndResetPassword(
      body.phoneNumber,
      body.otp,
      body.newPassword,
    );
  }

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Kiểm tra trạng thái hoạt động của auth service'
  })
  @ApiResponse({
    status: 200,
    description: 'Service đang hoạt động',
    schema: {
      type: 'string',
      example: 'OK'
    }
  })
  healthCheck() {
    return 'OK';
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates Google OAuth flow
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any, @Res() res: any) {
    const result = await this.authService.googleLogin(req.user);

    const isProduction = process.env.NODE_ENV === 'production';
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const isCrossDomain = frontendUrl.includes('ngrok');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isCrossDomain || isProduction, // true for ngrok/production
      sameSite: isCrossDomain ? 'none' : 'lax', // 'none' for cross-domain
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend with ONLY access token (refresh token in cookie)
    res.redirect(`${frontendUrl}/auth/callback?token=${result.accessToken}`);
  }
}
