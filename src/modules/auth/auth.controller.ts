import {
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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
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

    return { accessToken: newTokens.accessToken };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    response.clearCookie('refresh_token');
    return { message: 'Logged out successfully' };
  }

  // ===== FORGOT PASSWORD - Direct Reset (For Demo) =====
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: any) {
    return this.authService.resetPassword(
      forgotPasswordDto.phoneNumber,
      forgotPasswordDto.newPassword,
    );
  }

  // ===== FORGOT PASSWORD - OTP Flow (For Production) =====
  @Public()
  @Post('forgot-password/request-otp')
  async requestOtp(@Body() body: { phoneNumber: string }) {
    return this.authService.requestPasswordResetOtp(body.phoneNumber);
  }

  @Public()
  @Post('forgot-password/verify-otp')
  async verifyOtp(
    @Body() body: { phoneNumber: string; otp: string; newPassword: string },
  ) {
    return this.authService.verifyOtpAndResetPassword(
      body.phoneNumber,
      body.otp,
      body.newPassword,
    );
  }

  @Public()
  @Get('health')
  healthCheck() {
    return 'OK';
  }

  // ===== GOOGLE OAUTH =====
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

    // Set refresh token in httpOnly cookie (same as regular login)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax', // 'lax' for localhost, 'none' for cross-domain in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend with ONLY access token (refresh token in cookie)
    const frontendUrl = `http://localhost:5173/auth/callback?token=${result.accessToken}`;
    res.redirect(frontendUrl);
  }
}
