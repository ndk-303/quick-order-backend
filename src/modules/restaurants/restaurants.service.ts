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
import {
  FavoriteRestaurant,
  FavoriteRestaurantDocument,
} from './schemas/favorite-restaurant.schema';
import { CreateRestaurantTypeDto } from './dto/create-restaurant-type.dto';
import slugify from 'slugify';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(RestaurantType.name)
    private restaurantTypeModel: Model<RestaurantTypeDocument>,
    @InjectModel(FavoriteRestaurant.name)
    private favoriteRestaurantModel: Model<FavoriteRestaurantDocument>,
  ) { }

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

  // Favorite Restaurants Methods
  async addFavorite(
    userId: string,
    restaurantId: string,
  ): Promise<FavoriteRestaurant> {
    if (!Types.ObjectId.isValid(restaurantId)) {
      throw new BadRequestException('Restaurant ID không hợp lệ');
    }

    // Check if restaurant exists
    const restaurant = await this.restaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundException('Nhà hàng không tồn tại');
    }

    // Check if already favorited
    const existing = await this.favoriteRestaurantModel.findOne({
      userId: new Types.ObjectId(userId),
      restaurantId: new Types.ObjectId(restaurantId),
    });

    if (existing) {
      throw new BadRequestException('Nhà hàng đã có trong danh sách yêu thích');
    }

    const favorite = new this.favoriteRestaurantModel({
      userId: new Types.ObjectId(userId),
      restaurantId: new Types.ObjectId(restaurantId),
    });

    return favorite.save();
  }

  async removeFavorite(userId: string, restaurantId: string): Promise<void> {
    if (!Types.ObjectId.isValid(restaurantId)) {
      throw new BadRequestException('Restaurant ID không hợp lệ');
    }

    const result = await this.favoriteRestaurantModel.deleteOne({
      userId: new Types.ObjectId(userId),
      restaurantId: new Types.ObjectId(restaurantId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Nhà hàng không có trong danh sách yêu thích');
    }
  }

  async getFavorites(userId: string) {
    const temp = await this.favoriteRestaurantModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('restaurantId')
      .sort({ createdAt: -1 })
      .select('restaurantId')
      .exec();
    return temp.map((r) => r.restaurantId);
  }

  async isFavorite(userId: string, restaurantId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(restaurantId)) {
      return false;
    }

    const favorite = await this.favoriteRestaurantModel.findOne({
      userId: new Types.ObjectId(userId),
      restaurantId: new Types.ObjectId(restaurantId),
    });

    return !!favorite;
  }
}
