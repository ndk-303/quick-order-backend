import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as passwordUtil from 'src/common/utils/password.util';

jest.mock('src/common/utils/password.util');

describe('AuthService', () => {
    let service: AuthService;
    let userModel: Model<UserDocument>;
    let jwtService: JwtService;

    const mockUser = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        phoneNumber: '0123456789',
        password: 'hashedPassword123',
        fullName: 'Test User',
        email: 'test@example.com',
        address: '123 Test St',
        role: 'customer',
        isActive: true,
        isVerified: true,
        authProviders: ['phone'],
        verificationOtp: '123456',
        otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
        refreshToken: 'oldRefreshToken',
        save: jest.fn(),
    };

    const mockUserModel = {
        findOne: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        updateOne: jest.fn(),
    };

    const mockJwtService = {
        sign: jest.fn((payload, options) => {
            if (options?.expiresIn === '15d') return 'mockToken';
            if (options?.expiresIn === '15m') return 'mockAccessToken';
            if (options?.expiresIn === '7d') return 'mockRefreshToken';
            return 'mockToken';
        }),
        verify: jest.fn(),
    };

    beforeEach(async () => {
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
        userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
        jwtService = module.get<JwtService>(JwtService);

        (passwordUtil.hashPassword as jest.Mock).mockResolvedValue('hashedPassword123');
        (passwordUtil.comparePassword as jest.Mock).mockResolvedValue(true);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('register', () => {
        const registerDto: RegisterDto = {
            phoneNumber: '0123456789',
            password: 'password123',
            fullName: 'Test User',
            address: '123 Test St',
        };

        it('should register a new user successfully', async () => {
            mockUserModel.findOne.mockResolvedValue(null);
            mockUserModel.create.mockResolvedValue({
                ...mockUser,
                _id: new Types.ObjectId(),
            });

            const result = await service.register(registerDto);

            expect(mockUserModel.findOne).toHaveBeenCalledWith({
                phoneNumber: registerDto.phoneNumber,
            });
            expect(passwordUtil.hashPassword).toHaveBeenCalledWith(registerDto.password);
            expect(mockUserModel.create).toHaveBeenCalled();
            expect(result).toHaveProperty('message');
            expect(result).toHaveProperty('_id');
        });

        it('should throw BadRequestException when phone number already exists', async () => {
            mockUserModel.findOne.mockResolvedValue(mockUser);

            await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
            await expect(service.register(registerDto)).rejects.toThrow(
                'Số điện thoại đã tồn tại',
            );
        });
    });

    describe('login', () => {
        const loginDto: LoginDto = {
            phoneNumber: '0123456789',
            password: 'password123',
        };

        it('should login successfully with valid credentials', async () => {
            const mockSelect = jest.fn().mockResolvedValue(mockUser);
            mockUserModel.findOne.mockReturnValue({ select: mockSelect });
            mockUserModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

            // Override sign mock implementation for this test to return distinct tokens if needed
            // But since the implementation now uses the same expiry, the mock returns 'mockToken' for both.
            // We just verify properties exist.

            const result = await service.login(loginDto);

            expect(mockUserModel.findOne).toHaveBeenCalledWith({
                phoneNumber: loginDto.phoneNumber,
            });
            expect(passwordUtil.comparePassword).toHaveBeenCalledWith(
                loginDto.password,
                mockUser.password,
            );
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result).toHaveProperty('user');
            expect(result).toHaveProperty('message', 'Đăng nhập thành công');
        });

        it('should throw UnauthorizedException when user not found', async () => {
            const mockSelect = jest.fn().mockResolvedValue(null);
            mockUserModel.findOne.mockReturnValue({ select: mockSelect });

            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
            await expect(service.login(loginDto)).rejects.toThrow(
                'Số điện thoại hoặc mật khẩu không đúng',
            );
        });

        it('should throw UnauthorizedException when password is incorrect', async () => {
            const mockSelect = jest.fn().mockResolvedValue(mockUser);
            mockUserModel.findOne.mockReturnValue({ select: mockSelect });
            (passwordUtil.comparePassword as jest.Mock).mockResolvedValue(false);

            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
            await expect(service.login(loginDto)).rejects.toThrow(
                'Số điện thoại hoặc mật khẩu không đúng',
            );
        });

        it('should throw UnauthorizedException when account is not active', async () => {
            const inactiveUser = { ...mockUser, isActive: false };
            const mockSelect = jest.fn().mockResolvedValue(inactiveUser);
            mockUserModel.findOne.mockReturnValue({ select: mockSelect });

            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
            await expect(service.login(loginDto)).rejects.toThrow(
                'Tài khoản chưa được kích hoạt. Vui lòng xác thực OTP.',
            );
        });
    });

    describe('logout', () => {
        it('should logout user successfully', async () => {
            const userId = mockUser._id.toString();
            mockUserModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.logout(userId);

            expect(mockUserModel.updateOne).toHaveBeenCalledWith(
                { _id: userId },
                { refreshToken: null },
            );
            expect(result).toHaveProperty('message', 'Đăng xuất thành công');
        });
    });

    describe('refreshToken', () => {
        it('should refresh token successfully', async () => {
            const refreshToken = 'validRefreshToken';
            const payload = { sub: mockUser._id.toString(), role: 'customer' };

            mockJwtService.verify.mockReturnValue(payload);
            const mockSelect = jest.fn().mockResolvedValue({
                ...mockUser,
                refreshToken: refreshToken,
            });
            mockUserModel.findById.mockReturnValue({ select: mockSelect });
            mockUserModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.refreshToken(refreshToken);

            expect(mockJwtService.verify).toHaveBeenCalledWith(refreshToken);
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result).toHaveProperty('user');
        });

        it('should throw UnauthorizedException when token is invalid', async () => {
            const refreshToken = 'invalidRefreshToken';
            mockJwtService.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await expect(service.refreshToken(refreshToken)).rejects.toThrow(
                UnauthorizedException,
            );
            await expect(service.refreshToken(refreshToken)).rejects.toThrow(
                'Refresh token hết hạn',
            );
        });

        it('should throw UnauthorizedException when refresh token does not match', async () => {
            const refreshToken = 'validRefreshToken';
            const payload = { sub: mockUser._id.toString(), role: 'customer' };

            mockJwtService.verify.mockReturnValue(payload);
            const mockSelect = jest.fn().mockResolvedValue({
                ...mockUser,
                refreshToken: 'differentRefreshToken',
            });
            mockUserModel.findById.mockReturnValue({ select: mockSelect });

            await expect(service.refreshToken(refreshToken)).rejects.toThrow(
                UnauthorizedException,
            );
            await expect(service.refreshToken(refreshToken)).rejects.toThrow(
                'Refresh token hết hạn',
            );
        });
    });

    describe('verifyAccount', () => {
        it('should verify account successfully', async () => {
            const phoneNumber = '0123456789';
            const otp = '123456';
            const unverifiedUser = { ...mockUser, isActive: false };

            const mockSelect = jest.fn().mockResolvedValue(unverifiedUser);
            mockUserModel.findOne.mockReturnValue({ select: mockSelect });
            mockUserModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.verifyAccount(phoneNumber, otp);

            expect(mockUserModel.updateOne).toHaveBeenCalledWith(
                { _id: unverifiedUser._id },
                {
                    isActive: true,
                    verificationOtp: null,
                    otpExpiry: null,
                },
            );
            expect(result).toHaveProperty('message', 'Kích hoạt tài khoản thành công');
        });

        it('should throw BadRequestException when OTP is incorrect', async () => {
            const phoneNumber = '0123456789';
            const otp = 'wrongOtp';
            const unverifiedUser = { ...mockUser, isActive: false, verificationOtp: '123456' };

            const mockSelect = jest.fn().mockResolvedValue(unverifiedUser);
            mockUserModel.findOne.mockReturnValue({ select: mockSelect });

            await expect(service.verifyAccount(phoneNumber, otp)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.verifyAccount(phoneNumber, otp)).rejects.toThrow(
                'Mã OTP không đúng',
            );
        });

        it('should throw BadRequestException when OTP is expired', async () => {
            const phoneNumber = '0123456789';
            const otp = '123456';
            const expiredUser = {
                ...mockUser,
                isActive: false,
                otpExpiry: new Date(Date.now() - 1000),
            };

            const mockSelect = jest.fn().mockResolvedValue(expiredUser);
            mockUserModel.findOne.mockReturnValue({ select: mockSelect });

            await expect(service.verifyAccount(phoneNumber, otp)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.verifyAccount(phoneNumber, otp)).rejects.toThrow(
                'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.',
            );
        });

        it('should throw BadRequestException when account is already active', async () => {
            const phoneNumber = '0123456789';
            const otp = '123456';

            const mockSelect = jest.fn().mockResolvedValue(mockUser);
            mockUserModel.findOne.mockReturnValue({ select: mockSelect });

            await expect(service.verifyAccount(phoneNumber, otp)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.verifyAccount(phoneNumber, otp)).rejects.toThrow(
                'Tài khoản đã được kích hoạt',
            );
        });
    });

    describe('resendVerificationOtp', () => {
        it('should resend OTP successfully', async () => {
            const phoneNumber = '0123456789';
            const unverifiedUser = { ...mockUser, isActive: false };

            mockUserModel.findOne.mockResolvedValue(unverifiedUser);
            mockUserModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.resendVerificationOtp(phoneNumber);

            expect(mockUserModel.updateOne).toHaveBeenCalled();
            expect(result).toHaveProperty('message', 'Mã OTP đã được gửi lại');
        });

        it('should throw BadRequestException when user not found', async () => {
            const phoneNumber = '0123456789';
            mockUserModel.findOne.mockResolvedValue(null);

            await expect(service.resendVerificationOtp(phoneNumber)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.resendVerificationOtp(phoneNumber)).rejects.toThrow(
                'Số điện thoại không tồn tại',
            );
        });

        it('should throw BadRequestException when account is already active', async () => {
            const phoneNumber = '0123456789';
            mockUserModel.findOne.mockResolvedValue(mockUser);

            await expect(service.resendVerificationOtp(phoneNumber)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.resendVerificationOtp(phoneNumber)).rejects.toThrow(
                'Tài khoản đã được kích hoạt',
            );
        });
    });

    describe('verifyOtpAndResetPassword', () => {
        it('should reset password successfully', async () => {
            const phoneNumber = '0123456789';
            const otp = '123456';
            const newPassword = 'newPassword123';

            const mockSelect = jest.fn().mockResolvedValue(mockUser);
            mockUserModel.findOne.mockReturnValue({ select: mockSelect });
            mockUserModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.verifyOtpAndResetPassword(
                phoneNumber,
                otp,
                newPassword,
            );

            expect(passwordUtil.hashPassword).toHaveBeenCalledWith(newPassword);
            expect(mockUserModel.updateOne).toHaveBeenCalled();
            expect(result).toHaveProperty('message', 'Đặt lại mật khẩu thành công');
        });

        it('should throw BadRequestException when OTP is incorrect', async () => {
            const phoneNumber = '0123456789';
            const otp = 'wrongOtp';
            const newPassword = 'newPassword123';

            const mockSelect = jest.fn().mockResolvedValue(mockUser);
            mockUserModel.findOne.mockReturnValue({ select: mockSelect });

            await expect(
                service.verifyOtpAndResetPassword(phoneNumber, otp, newPassword),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('googleLogin', () => {
        const googleUser = {
            id: 'google123',
            email: 'test@gmail.com',
            firstName: 'Test',
            lastName: 'User',
        };

        it('should create new user for first-time Google login', async () => {
            mockUserModel.findOne.mockResolvedValue(null);
            mockUserModel.create.mockResolvedValue({
                ...mockUser,
                googleId: googleUser.id,
                email: googleUser.email,
            });
            mockUserModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.googleLogin(googleUser);

            expect(mockUserModel.create).toHaveBeenCalled();
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result).toHaveProperty('user');
        });

        it('should link Google account to existing user', async () => {
            const existingUser = { ...mockUser, googleId: null, save: jest.fn() };
            mockUserModel.findOne.mockResolvedValue(existingUser);
            existingUser.save.mockResolvedValue(existingUser);
            mockUserModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.googleLogin(googleUser);

            expect(existingUser.save).toHaveBeenCalled();
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
        });

        it('should login existing Google user', async () => {
            const googleLinkedUser = { ...mockUser, googleId: googleUser.id };
            mockUserModel.findOne.mockResolvedValue(googleLinkedUser);
            mockUserModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.googleLogin(googleUser);

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
        });

        it('should throw BadRequestException on error', async () => {
            mockUserModel.findOne.mockRejectedValue(new Error('Database error'));

            await expect(service.googleLogin(googleUser)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('generateTokens', () => {
        it('should generate access and refresh tokens', () => {
            const tokens = service['generateTokens'](mockUser as any);

            expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
            expect(tokens).toHaveProperty('accessToken', 'mockToken');
            expect(tokens).toHaveProperty('refreshToken', 'mockToken');
        });
    });
});
