import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name)
        private userModel: Model<UserDocument>,
    ) { }

    async findById(userId: string): Promise<User> {
        if (!Types.ObjectId.isValid(userId)) {
            throw new BadRequestException('User ID không hợp lệ');
        }

        const user = await this.userModel
            .findById(userId)
            .select('-password -refreshToken')
            .exec();

        if (!user) {
            throw new NotFoundException('Người dùng không tồn tại');
        }

        return user;
    }

    async update(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
        if (!Types.ObjectId.isValid(userId)) {
            throw new BadRequestException('User ID không hợp lệ');
        }

        const updatedUser = await this.userModel
            .findByIdAndUpdate(userId, { $set: updateUserDto }, { new: true })
            .select('-password -refreshToken')
            .exec();

        if (!updatedUser) {
            throw new NotFoundException('Người dùng không tồn tại');
        }

        return updatedUser;
    }
}

