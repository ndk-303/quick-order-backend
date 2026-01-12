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
import {
  RestaurantType,
  RestaurantTypeDocument,
} from './schemas/restaurant-types.schema';
import { CreateRestaurantTypeDto } from './dto/create-restaurant-type.dto';
import slugify from 'slugify';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(RestaurantType.name)
    private restaurantTypeModel: Model<RestaurantTypeDocument>,
  ) {}

  async create(createRestaurantDto: CreateRestaurantDto): Promise<Restaurant> {
    const restaurantType = await this.restaurantModel.findOne({
      slug: createRestaurantDto.type,
    });

    if (!restaurantType)
      throw new BadRequestException('Không có loại nhà hàng này');

    const newRestaurant = new this.restaurantModel({
      ...createRestaurantDto,
      location: {
        type: 'Point',
        coordinates: createRestaurantDto.coordinates,
      },
      type: restaurantType._id,
    });

    return newRestaurant.save();
  }

  async findAll(): Promise<Restaurant[]> {
    return this.restaurantModel
      .find()
      .sort({ createdAt: -1 })
      .populate('type', 'name slug')
      .exec();
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

  async createRestaurantType(createTypeDto: CreateRestaurantTypeDto) {
    const slug = slugify(createTypeDto.name, {
      lower: true,
      strict: true,
      locale: 'vi',
    });

    const exists = await this.restaurantTypeModel.findOne({ slug });
    if (exists) {
      throw new BadRequestException('Restaurant type already exists');
    }

    return this.restaurantTypeModel.create({
      name: createTypeDto.name,
      slug,
      imageUrl: createTypeDto.imageUrl,
    });
  }

  async findAllTypes(): Promise<RestaurantType[]> {
    return await this.restaurantTypeModel
      .find()
      .select('-createdAt -updatedAt');
  }
}
