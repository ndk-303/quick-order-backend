import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
    let service: UsersService;
    let userModel: Model<UserDocument>;

    const mockUser = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        phoneNumber: '0123456789',
        fullName: 'Test User',
        email: 'test@example.com',
        address: '123 Test St',
        role: 'customer',
        isActive: true,
    };

    const mockUserModel = {
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: getModelToken(User.name),
                    useValue: mockUserModel,
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findById', () => {
        it('should return a user when valid ID is provided', async () => {
            const userId = mockUser._id.toString();
            const mockExec = jest.fn().mockResolvedValue(mockUser);
            const mockSelect = jest.fn().mockReturnValue({ exec: mockExec });

            mockUserModel.findById.mockReturnValue({ select: mockSelect });

            const result = await service.findById(userId);

            expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
            expect(mockSelect).toHaveBeenCalledWith('-password -refreshToken');
            expect(result).toEqual(mockUser);
        });

        it('should throw BadRequestException when invalid ID is provided', async () => {
            const invalidId = 'invalid-id';

            await expect(service.findById(invalidId)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.findById(invalidId)).rejects.toThrow(
                'User ID không hợp lệ',
            );
        });

        it('should throw NotFoundException when user does not exist', async () => {
            const userId = new Types.ObjectId().toString();
            const mockExec = jest.fn().mockResolvedValue(null);
            const mockSelect = jest.fn().mockReturnValue({ exec: mockExec });

            mockUserModel.findById.mockReturnValue({ select: mockSelect });

            await expect(service.findById(userId)).rejects.toThrow(
                NotFoundException,
            );
            await expect(service.findById(userId)).rejects.toThrow(
                'Người dùng không tồn tại',
            );
        });
    });

    describe('update', () => {
        const updateDto: UpdateUserDto = {
            fullName: 'Updated Name',
            address: 'New Address',
        };

        it('should update and return user when valid data is provided', async () => {
            const userId = mockUser._id.toString();
            const updatedUser = { ...mockUser, ...updateDto };
            const mockExec = jest.fn().mockResolvedValue(updatedUser);
            const mockSelect = jest.fn().mockReturnValue({ exec: mockExec });

            mockUserModel.findByIdAndUpdate.mockReturnValue({ select: mockSelect });

            const result = await service.update(userId, updateDto);

            expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
                userId,
                { $set: updateDto },
                { new: true },
            );
            expect(mockSelect).toHaveBeenCalledWith('-password -refreshToken');
            expect(result).toEqual(updatedUser);
        });

        it('should throw BadRequestException when invalid ID is provided', async () => {
            const invalidId = 'invalid-id';

            await expect(service.update(invalidId, updateDto)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.update(invalidId, updateDto)).rejects.toThrow(
                'User ID không hợp lệ',
            );
        });

        it('should throw NotFoundException when user does not exist', async () => {
            const userId = new Types.ObjectId().toString();
            const mockExec = jest.fn().mockResolvedValue(null);
            const mockSelect = jest.fn().mockReturnValue({ exec: mockExec });

            mockUserModel.findByIdAndUpdate.mockReturnValue({ select: mockSelect });

            await expect(service.update(userId, updateDto)).rejects.toThrow(
                NotFoundException,
            );
            await expect(service.update(userId, updateDto)).rejects.toThrow(
                'Người dùng không tồn tại',
            );
        });
    });
});
