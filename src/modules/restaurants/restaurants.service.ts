import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Restaurant, RestaurantDocument } from './schemas/restaurant.schema';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
  ) {}

  async create(
    createRestaurantDto: CreateRestaurantDto,
    ownerId: string,
  ): Promise<Restaurant> {
    const newRestaurant = new this.restaurantModel({
      ...createRestaurantDto,
      ownerId,
      location: {
        type: 'Point',
        coordinates: createRestaurantDto.coordinates,
      },
    });
    return newRestaurant.save();
  }

  async findAll(): Promise<Restaurant[]> {
    return this.restaurantModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(_id: string): Promise<Restaurant> {
    if (!Types.ObjectId.isValid(_id)) {
      throw new BadRequestException('ID không hợp lệ');
    }
    const restaurant = await this.restaurantModel.findById({ _id });
    if (!restaurant) {
      throw new NotFoundException('Nhà hàng không tồn tại');
    }

    return restaurant;
  }

  async update(
    _id: string,
    updateRestaurantDto: UpdateRestaurantDto,
  ): Promise<Restaurant> {
    if (!Types.ObjectId.isValid(_id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const updated = await this.restaurantModel.findByIdAndUpdate(
      _id,
      { $set: updateRestaurantDto },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Nhà hàng không tồn tại');
    }

    return updated;
  }

  async remove(_id: string) {
    if (!Types.ObjectId.isValid(_id)) {
      throw new BadRequestException('ID không hợp lệ');
    }
    await this.restaurantModel.deleteOne({ _id });
    return { message: 'Xóa thành công' };
  }
}
