import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Restaurant, RestaurantDocument } from './schemas/restaurant.schema';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { RestaurantTypesService } from './restaurant-types.service';

@Injectable()
export class RestaurantsService {
  private readonly logger = new Logger(RestaurantsService.name);

  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
    private readonly restaurantTypesService: RestaurantTypesService,
  ) { }

  async create(createRestaurantDto: CreateRestaurantDto): Promise<Restaurant> {
    const restaurantType = await this.restaurantTypesService.findBySlug(
      createRestaurantDto.type,
    );
    if (!restaurantType) {
      throw new BadRequestException('Không có loại nhà hàng này');
    }

    this.logger.debug(`Creating restaurant: ${createRestaurantDto.name}`);

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

    const restaurant = await this.restaurantModel.findById(_id);
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

  async remove(_id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(_id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    await this.restaurantModel.deleteOne({ _id });
    return { message: 'Xóa thành công' };
  }
}
