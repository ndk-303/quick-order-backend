import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import * as passwordUtil from 'src/common/utils/password.util';
import { AuthService } from './auth.service';
import { User } from '../users/schemas/user.schema';

jest.mock('src/common/utils/password.util', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

type MockUserModel = {
  findOne: jest.Mock;
  create: jest.Mock;
  updateOne: jest.Mock;
};

describe('AuthService', () => {
  let service: AuthService;
  let userModel: MockUserModel;

  const userId = new Types.ObjectId('507f1f77bcf86cd799439011');

  const makeUser = (overrides: Partial<any> = {}) => ({
    _id: userId,
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
    ...overrides,
  });

  const makeSelectChain = <T>(value: T) => ({
    // Mock shape for mongoose query.select()
    select: jest.fn().mockResolvedValue(value),
  });

  beforeEach(async () => {
    const mockUserModel: MockUserModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userModel = module.get(getModelToken(User.name));

    jest.clearAllMocks();
    (passwordUtil.hashPassword as jest.Mock).mockResolvedValue('hashed-password');
    (passwordUtil.comparePassword as jest.Mock).mockResolvedValue(true);
  });

  describe('register', () => {
    const dto = {
      phoneNumber: '0123456789',
      password: 'plain-password',
      fullName: 'New User',
      address: 'District 1',
    };

    it('registers successfully with valid data', async () => {
      userModel.findOne.mockResolvedValue(null);
      userModel.create.mockResolvedValue(makeUser());

      const result = await service.register(dto as any);

      expect(userModel.findOne).toHaveBeenCalledWith({ phoneNumber: dto.phoneNumber });
      expect(passwordUtil.hashPassword).toHaveBeenCalledWith(dto.password);
      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: dto.phoneNumber,
          password: 'hashed-password',
          fullName: dto.fullName,
          address: dto.address,
          authProviders: ['phone'],
          verificationOtp: expect.any(String),
          otpExpiry: expect.any(Date),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          message: 'Đăng ký thành công. Vui lòng kiểm tra mã OTP để kích hoạt tài khoản.',
          _id: userId,
          otp: expect.any(String),
        }),
      );
    });

    it('uses empty address when address is missing', async () => {
      userModel.findOne.mockResolvedValue(null);
      userModel.create.mockResolvedValue(makeUser());

      await service.register({ ...dto, address: undefined } as any);

      expect(userModel.create).toHaveBeenCalledWith(expect.objectContaining({ address: '' }));
    });

    it('throws when phone number already exists', async () => {
      userModel.findOne.mockResolvedValue(makeUser());

      await expect(service.register(dto as any)).rejects.toThrow(BadRequestException);
      await expect(service.register(dto as any)).rejects.toThrow('Số điện thoại đã tồn tại');
      expect(userModel.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto = { phoneNumber: '0123456789', password: 'plain-password' };

    it('returns session user payload for valid credentials', async () => {
      const user = makeUser();
      userModel.findOne.mockReturnValue(makeSelectChain(user));

      const result = await service.login(dto as any);

      expect(passwordUtil.comparePassword).toHaveBeenCalledWith(dto.password, user.password);
      expect(result).toEqual({
        user: {
          userId: user._id.toString(),
          role: user.role,
          restaurantId: null,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
        },
      });
    });

    it('throws when account does not exist', async () => {
      userModel.findOne.mockReturnValue(makeSelectChain(null));

      await expect(service.login(dto as any)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto as any)).rejects.toThrow('Số điện thoại không đúng');
    });

    it('throws when account has no password', async () => {
      userModel.findOne.mockReturnValue(makeSelectChain(makeUser({ password: null })));

      await expect(service.login(dto as any)).rejects.toThrow('Tài khoản này sử dụng phương thức đăng nhập khác');
    });

    it('throws when password is incorrect', async () => {
      userModel.findOne.mockReturnValue(makeSelectChain(makeUser()));
      (passwordUtil.comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto as any)).rejects.toThrow('Mật khẩu không đúng');
    });

    it('throws when account is inactive', async () => {
      userModel.findOne.mockReturnValue(makeSelectChain(makeUser({ isActive: false })));

      await expect(service.login(dto as any)).rejects.toThrow(
        'Tài khoản chưa được kích hoạt. Vui lòng xác thực OTP.',
      );
    });
  });

  describe('logout', () => {
    it('returns success message', async () => {
      await expect(service.logout()).resolves.toEqual({ message: 'Đăng xuất thành công' });
    });
  });

  describe('verifyAccount', () => {
    it('activates account when otp is valid', async () => {
      const user = makeUser({ isActive: false, verificationOtp: '111111' });
      userModel.findOne.mockReturnValue(makeSelectChain(user));
      userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.verifyAccount('0123456789', '111111');

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

    it('throws when otp is expired', async () => {
      userModel.findOne.mockReturnValue(
        makeSelectChain(makeUser({ isActive: false, otpExpiry: new Date(Date.now() - 1000) })),
      );

      await expect(service.verifyAccount('0123456789', '123456')).rejects.toThrow(
        'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.',
      );
    });
  });

  describe('resendVerificationOtp', () => {
    it('resends otp for inactive account', async () => {
      userModel.findOne.mockResolvedValue(makeUser({ isActive: false }));
      userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.resendVerificationOtp('0123456789');

      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: userId },
        {
          verificationOtp: expect.any(String),
          otpExpiry: expect.any(Date),
        },
      );
      expect(result).toEqual({ message: 'Mã OTP đã được gửi lại' });
    });

    it('throws when account already active', async () => {
      userModel.findOne.mockResolvedValue(makeUser({ isActive: true }));

      await expect(service.resendVerificationOtp('0123456789')).rejects.toThrow(
        'Tài khoản đã được kích hoạt',
      );
    });
  });

  describe('requestOtp', () => {
    it('updates reset otp for existing account', async () => {
      userModel.findOne.mockResolvedValue(makeUser());
      userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.requestOtp('0123456789');

      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: userId },
        {
          verificationOtp: expect.any(String),
          otpExpiry: expect.any(Date),
        },
      );
      expect(result).toEqual({ message: 'Mã OTP đã được gửi đến số điện thoại của bạn' });
    });
  });

  describe('verifyOtpAndResetPassword', () => {
    it('resets password when otp is valid', async () => {
      const user = makeUser({ verificationOtp: '654321' });
      userModel.findOne.mockReturnValue(makeSelectChain(user));
      userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.verifyOtpAndResetPassword('0123456789', '654321', 'new-password');

      expect(passwordUtil.hashPassword).toHaveBeenCalledWith('new-password');
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: user._id },
        {
          password: 'hashed-password',
          verificationOtp: null,
          otpExpiry: null,
        },
      );
      expect(result).toEqual({ message: 'Đặt lại mật khẩu thành công' });
    });
  });
});
