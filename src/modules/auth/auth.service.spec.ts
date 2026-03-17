import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import * as passwordUtil from 'src/common/utils/password.util';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { User, UserDocument } from '../users/schemas/user.schema';

jest.mock('src/common/utils/password.util', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

type SelectChain<T> = {
  select: jest.Mock<Promise<T>, [string]>;
};

type MockUserModel = {
  findOne: jest.Mock;
  findById: jest.Mock;
  create: jest.Mock;
  updateOne: jest.Mock;
};

describe('AuthService', () => {
  let service: AuthService;
  let userModel: MockUserModel;
  let jwtService: jest.Mocked<JwtService>;

  const mockUserId = new Types.ObjectId('507f1f77bcf86cd799439011');

  const makeUser = (overrides: Partial<any> = {}) => ({
    _id: mockUserId,
    phoneNumber: '0123456789',
    password: 'hashed-password',
    fullName: 'Test User',
    email: 'test@example.com',
    role: 'CLIENT',
    restaurantId: null,
    authProviders: ['phone'],
    isActive: true,
    verificationOtp: '123456',
    otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
    refreshToken: 'stored-refresh-token',
    googleId: undefined,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const makeSelectChain = <T>(value: T): SelectChain<T> => ({
    // Mongoose usually returns a query object where select() resolves to data.
    select: jest.fn().mockResolvedValue(value),
  });

  beforeEach(async () => {
    const mockUserModel: MockUserModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
    };

    const mockJwtService: Partial<jest.Mocked<JwtService>> = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userModel = module.get<MockUserModel>(getModelToken(User.name));
    jwtService = module.get<JwtService>(JwtService) as jest.Mocked<JwtService>;

    jest.clearAllMocks();

    (passwordUtil.hashPassword as jest.Mock).mockResolvedValue('hashed-password');
    (passwordUtil.comparePassword as jest.Mock).mockResolvedValue(true);

    // Keep token generation deterministic across tests.
    jwtService.sign.mockImplementation((payload: object, options?: any) => {
      if (options?.expiresIn === '1h') {
        return 'access-token';
      }

      if (options?.expiresIn === '30d') {
        return 'refresh-token';
      }

      return 'token';
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      phoneNumber: '0123456789',
      password: 'plain-password',
      fullName: 'New User',
      address: 'District 1',
    };

    it('creates a new account when phone number does not exist', async () => {
      userModel.findOne.mockResolvedValue(null);
      userModel.create.mockResolvedValue(makeUser());

      const result = await service.register(registerDto);

      expect(userModel.findOne).toHaveBeenCalledWith({ phoneNumber: registerDto.phoneNumber });
      expect(passwordUtil.hashPassword).toHaveBeenCalledWith(registerDto.password);
      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: registerDto.phoneNumber,
          password: 'hashed-password',
          fullName: registerDto.fullName,
          address: registerDto.address,
          authProviders: ['phone'],
          verificationOtp: expect.any(String),
          otpExpiry: expect.any(Date),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          message: 'Đăng ký thành công. Vui lòng kiểm tra mã OTP để kích hoạt tài khoản.',
          _id: mockUserId,
          otp: expect.any(String),
        }),
      );
    });

    it('uses empty address when address is missing', async () => {
      userModel.findOne.mockResolvedValue(null);
      userModel.create.mockResolvedValue(makeUser());

      await service.register({ ...registerDto, address: undefined } as RegisterDto);

      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          address: '',
        }),
      );
    });

    it('throws BadRequestException when phone number already exists', async () => {
      userModel.findOne.mockResolvedValue(makeUser());

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(registerDto)).rejects.toThrow('Số điện thoại đã tồn tại');
      expect(userModel.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      phoneNumber: '0123456789',
      password: 'plain-password',
    };

    it('returns tokens and user info for valid credentials', async () => {
      const user = makeUser();
      const chain = makeSelectChain(user);
      userModel.findOne.mockReturnValue(chain);
      userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.login(loginDto);

      expect(userModel.findOne).toHaveBeenCalledWith({ phoneNumber: loginDto.phoneNumber });
      expect(chain.select).toHaveBeenCalledWith(
        '_id fullName email phoneNumber password role restaurantId authProviders isActive',
      );
      expect(passwordUtil.comparePassword).toHaveBeenCalledWith(loginDto.password, user.password);
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: user._id },
        { refreshToken: 'refresh-token' },
      );
      expect(result).toEqual(
        expect.objectContaining({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          message: 'Đăng nhập thành công',
        }),
      );
    });

    it('throws UnauthorizedException when phone number is not found', async () => {
      const chain = makeSelectChain(null);
      userModel.findOne.mockReturnValue(chain);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Số điện thoại không đúng');
    });

    it('throws UnauthorizedException when account has no password', async () => {
      const chain = makeSelectChain(makeUser({ password: null }));
      userModel.findOne.mockReturnValue(chain);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow(
        'Tài khoản này sử dụng phương thức đăng nhập khác',
      );
    });

    it('throws UnauthorizedException when password is incorrect', async () => {
      const chain = makeSelectChain(makeUser());
      userModel.findOne.mockReturnValue(chain);
      (passwordUtil.comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Mật khẩu không đúng');
    });

    it('throws UnauthorizedException when account is inactive', async () => {
      const chain = makeSelectChain(makeUser({ isActive: false }));
      userModel.findOne.mockReturnValue(chain);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow(
        'Tài khoản chưa được kích hoạt. Vui lòng xác thực OTP.',
      );
    });
  });

  describe('logout', () => {
    it('clears refresh token and returns success message', async () => {
      userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.logout(mockUserId.toString());

      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: mockUserId.toString() },
        { refreshToken: null },
      );
      expect(result).toEqual({ message: 'Đăng xuất thành công' });
    });
  });

  describe('refreshToken', () => {
    it('issues new tokens for valid refresh token', async () => {
      const inputRefreshToken = 'stored-refresh-token';
      const user = makeUser({ refreshToken: inputRefreshToken });
      jwtService.verify.mockReturnValue({ sub: user._id.toString(), role: user.role } as any);
      const chain = makeSelectChain(user);
      userModel.findById.mockReturnValue(chain);
      userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.refreshToken(inputRefreshToken);

      expect(jwtService.verify).toHaveBeenCalledWith(inputRefreshToken);
      expect(userModel.findById).toHaveBeenCalledWith(user._id.toString());
      expect(chain.select).toHaveBeenCalledWith('+refreshToken fullName email phoneNumber authProviders');
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: user._id },
        { refreshToken: 'refresh-token' },
      );
      expect(result).toEqual(
        expect.objectContaining({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: expect.objectContaining({ _id: user._id }),
        }),
      );
    });

    it('throws UnauthorizedException when jwt verification fails', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.refreshToken('bad-token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshToken('bad-token')).rejects.toThrow('Refresh token hết hạn');
    });

    it('throws UnauthorizedException when user cannot be found', async () => {
      jwtService.verify.mockReturnValue({ sub: mockUserId.toString(), role: 'CLIENT' } as any);
      userModel.findById.mockReturnValue(makeSelectChain(null));

      await expect(service.refreshToken('any-token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshToken('any-token')).rejects.toThrow('Refresh token hết hạn');
    });

    it('throws UnauthorizedException when token does not match stored token', async () => {
      const user = makeUser({ refreshToken: 'different-token' });
      jwtService.verify.mockReturnValue({ sub: user._id.toString(), role: user.role } as any);
      userModel.findById.mockReturnValue(makeSelectChain(user));

      await expect(service.refreshToken('incoming-token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshToken('incoming-token')).rejects.toThrow('Refresh token hết hạn');
    });
  });

  describe('verifyAccount', () => {
    const phoneNumber = '0123456789';

    it('activates account when OTP is valid and not expired', async () => {
      const user = makeUser({ isActive: false, verificationOtp: '654321' });
      const chain = makeSelectChain(user);
      userModel.findOne.mockReturnValue(chain);
      userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.verifyAccount(phoneNumber, '654321');

      expect(chain.select).toHaveBeenCalledWith('+verificationOtp +otpExpiry');
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: user._id },
        {
          isActive: true,
          verificationOtp: null,
          otpExpiry: null,
        },
      );
      expect(result).toEqual({ message: 'Kích hoạt tài khoản thành công' });
    });

    it('throws when phone number does not exist', async () => {
      userModel.findOne.mockReturnValue(makeSelectChain(null));

      await expect(service.verifyAccount(phoneNumber, '123456')).rejects.toThrow(BadRequestException);
      await expect(service.verifyAccount(phoneNumber, '123456')).rejects.toThrow('Số điện thoại không tồn tại');
    });

    it('throws when account is already active', async () => {
      userModel.findOne.mockReturnValue(makeSelectChain(makeUser({ isActive: true })));

      await expect(service.verifyAccount(phoneNumber, '123456')).rejects.toThrow(BadRequestException);
      await expect(service.verifyAccount(phoneNumber, '123456')).rejects.toThrow('Tài khoản đã được kích hoạt');
    });

    it('throws when OTP data is missing', async () => {
      userModel.findOne.mockReturnValue(
        makeSelectChain(makeUser({ isActive: false, verificationOtp: null, otpExpiry: null })),
      );

      await expect(service.verifyAccount(phoneNumber, '123456')).rejects.toThrow(BadRequestException);
      await expect(service.verifyAccount(phoneNumber, '123456')).rejects.toThrow(
        'Không tìm thấy mã OTP. Vui lòng yêu cầu gửi lại.',
      );
    });

    it('throws when OTP is expired', async () => {
      userModel.findOne.mockReturnValue(
        makeSelectChain(makeUser({ isActive: false, otpExpiry: new Date(Date.now() - 1000) })),
      );

      await expect(service.verifyAccount(phoneNumber, '123456')).rejects.toThrow(BadRequestException);
      await expect(service.verifyAccount(phoneNumber, '123456')).rejects.toThrow(
        'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.',
      );
    });

    it('throws when OTP does not match', async () => {
      userModel.findOne.mockReturnValue(
        makeSelectChain(makeUser({ isActive: false, verificationOtp: '654321' })),
      );

      await expect(service.verifyAccount(phoneNumber, '111111')).rejects.toThrow(BadRequestException);
      await expect(service.verifyAccount(phoneNumber, '111111')).rejects.toThrow('Mã OTP không đúng');
    });
  });

  describe('resendVerificationOtp', () => {
    it('updates OTP for inactive account', async () => {
      userModel.findOne.mockResolvedValue(makeUser({ isActive: false }));
      userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.resendVerificationOtp('0123456789');

      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: mockUserId },
        {
          verificationOtp: expect.any(String),
          otpExpiry: expect.any(Date),
        },
      );
      expect(result).toEqual({ message: 'Mã OTP đã được gửi lại' });
    });

    it('throws when account does not exist', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(service.resendVerificationOtp('0123456789')).rejects.toThrow(BadRequestException);
      await expect(service.resendVerificationOtp('0123456789')).rejects.toThrow('Số điện thoại không tồn tại');
    });

    it('throws when account is already active', async () => {
      userModel.findOne.mockResolvedValue(makeUser({ isActive: true }));

      await expect(service.resendVerificationOtp('0123456789')).rejects.toThrow(BadRequestException);
      await expect(service.resendVerificationOtp('0123456789')).rejects.toThrow('Tài khoản đã được kích hoạt');
    });
  });

  describe('requestOtp', () => {
    it('generates and stores reset OTP for existing account', async () => {
      userModel.findOne.mockResolvedValue(makeUser());
      userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.requestOtp('0123456789');

      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: mockUserId },
        {
          verificationOtp: expect.any(String),
          otpExpiry: expect.any(Date),
        },
      );
      expect(result).toEqual({ message: 'Mã OTP đã được gửi đến số điện thoại của bạn' });
    });

    it('throws when account does not exist', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(service.requestOtp('0123456789')).rejects.toThrow(BadRequestException);
      await expect(service.requestOtp('0123456789')).rejects.toThrow('Số điện thoại không tồn tại');
    });
  });

  describe('verifyOtpAndResetPassword', () => {
    const phoneNumber = '0123456789';
    const newPassword = 'new-password';

    it('resets password and clears OTP when input is valid', async () => {
      const user = makeUser({ verificationOtp: '654321' });
      userModel.findOne.mockReturnValue(makeSelectChain(user));
      userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.verifyOtpAndResetPassword(phoneNumber, '654321', newPassword);

      expect(passwordUtil.hashPassword).toHaveBeenCalledWith(newPassword);
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: user._id },
        {
          password: 'hashed-password',
          refreshToken: null,
          verificationOtp: null,
          otpExpiry: null,
        },
      );
      expect(result).toEqual({ message: 'Đặt lại mật khẩu thành công' });
    });

    it('throws when account does not exist', async () => {
      userModel.findOne.mockReturnValue(makeSelectChain(null));

      await expect(service.verifyOtpAndResetPassword(phoneNumber, '123456', newPassword)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyOtpAndResetPassword(phoneNumber, '123456', newPassword)).rejects.toThrow(
        'Số điện thoại không tồn tại',
      );
    });

    it('throws when OTP data is missing', async () => {
      userModel.findOne.mockReturnValue(
        makeSelectChain(makeUser({ verificationOtp: null, otpExpiry: null })),
      );

      await expect(service.verifyOtpAndResetPassword(phoneNumber, '123456', newPassword)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyOtpAndResetPassword(phoneNumber, '123456', newPassword)).rejects.toThrow(
        'Không tìm thấy mã OTP. Vui lòng yêu cầu gửi lại.',
      );
    });

    it('throws when OTP is expired', async () => {
      userModel.findOne.mockReturnValue(
        makeSelectChain(makeUser({ otpExpiry: new Date(Date.now() - 1000) })),
      );

      await expect(service.verifyOtpAndResetPassword(phoneNumber, '123456', newPassword)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyOtpAndResetPassword(phoneNumber, '123456', newPassword)).rejects.toThrow(
        'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.',
      );
    });

    it('throws when OTP is incorrect', async () => {
      userModel.findOne.mockReturnValue(makeSelectChain(makeUser({ verificationOtp: '654321' })));

      await expect(service.verifyOtpAndResetPassword(phoneNumber, '111111', newPassword)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyOtpAndResetPassword(phoneNumber, '111111', newPassword)).rejects.toThrow(
        'Mã OTP không đúng',
      );
    });
  });

  describe('googleLogin', () => {
    const googleUser = {
      id: 'google-123',
      email: 'google.user@example.com',
      firstName: 'Google',
      lastName: 'User',
    };

    it('creates a new account when no existing user is found', async () => {
      userModel.findOne.mockResolvedValue(null);
      userModel.create.mockResolvedValue(
        makeUser({
          googleId: googleUser.id,
          email: googleUser.email,
          authProviders: ['google'],
          fullName: 'Google User',
          phoneNumber: null,
        }),
      );
      userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.googleLogin(googleUser);

      expect(userModel.findOne).toHaveBeenCalledWith({
        $or: [{ googleId: googleUser.id }, { email: googleUser.email }],
      });
      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          googleId: googleUser.id,
          email: googleUser.email,
          authProviders: ['google'],
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        }),
      );
    });

    it('links Google account to existing user when googleId is missing', async () => {
      const existingUser = makeUser({
        googleId: null,
        email: '',
        authProviders: ['phone'],
        save: jest.fn().mockResolvedValue(undefined),
      });
      userModel.findOne.mockResolvedValue(existingUser);
      userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await service.googleLogin(googleUser);

      expect(existingUser.googleId).toBe(googleUser.id);
      expect(existingUser.email).toBe(googleUser.email);
      expect(existingUser.authProviders).toContain('google');
      expect(existingUser.save).toHaveBeenCalled();
    });

    it('does not duplicate authProviders when google already exists in provider list', async () => {
      const existingUser = makeUser({
        googleId: null,
        authProviders: ['phone', 'google'],
        save: jest.fn().mockResolvedValue(undefined),
      });
      userModel.findOne.mockResolvedValue(existingUser);
      userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await service.googleLogin(googleUser);

      const googleProviders = existingUser.authProviders.filter((provider: string) => provider === 'google');
      expect(googleProviders).toHaveLength(1);
    });

    it('logs in normally when user already has googleId', async () => {
      const user = makeUser({ googleId: googleUser.id, authProviders: ['google'] });
      userModel.findOne.mockResolvedValue(user);
      userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.googleLogin(googleUser);

      expect(user.save).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        }),
      );
    });

    it('throws BadRequestException when underlying operation fails', async () => {
      userModel.findOne.mockRejectedValue(new Error('db failure'));

      await expect(service.googleLogin(googleUser)).rejects.toThrow(BadRequestException);
      await expect(service.googleLogin(googleUser)).rejects.toThrow('Đăng nhập Google thất bại: db failure');
    });
  });

  describe('generateTokens', () => {
    it('signs access and refresh tokens with expected payload and expiry', () => {
      const user = makeUser({ role: 'ADMIN', restaurantId: mockUserId });

      const tokens = (service as any).generateTokens(user as unknown as UserDocument);

      expect(jwtService.sign).toHaveBeenNthCalledWith(
        1,
        {
          sub: user._id.toString(),
          role: 'ADMIN',
          restaurantId: mockUserId,
        },
        { expiresIn: '1h' },
      );
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        2,
        {
          sub: user._id.toString(),
          role: 'ADMIN',
          restaurantId: mockUserId,
        },
        { expiresIn: '30d' },
      );
      expect(tokens).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    });
  });
});
