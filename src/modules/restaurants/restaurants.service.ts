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
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { buildPaginatedResult, PaginatedResult } from 'src/common/interfaces/paginated-result.interface';

@Injectable()
export class RestaurantsService {
  private readonly logger = new Logger(RestaurantsService.name);

  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
    private readonly restaurantTypesService: RestaurantTypesService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async create(
    createRestaurantDto: CreateRestaurantDto,
    file?: Express.Multer.File,
  ): Promise<Restaurant> {
    const restaurantType = await this.restaurantTypesService.findBySlug(
      createRestaurantDto.type,
    );
    if (!restaurantType) {
      throw new BadRequestException('Không có loại nhà hàng này');
    }

    if (!file) {
      throw new BadRequestException('Ảnh nhà hàng là bắt buộc');
    }

    const imageUrl = await this.cloudinaryService.uploadRestaurantImage(file);

    this.logger.debug(`Creating restaurant: ${createRestaurantDto.name}`);

    const newRestaurant = new this.restaurantModel({
      ...createRestaurantDto,
      imageUrl,
      location: {
        type: 'Point',
        coordinates: createRestaurantDto.coordinates,
      },
      type: restaurantType._id,
    });

    return newRestaurant.save();
  }

  async findAll(pagination: PaginationDto = {}): Promise<PaginatedResult<Restaurant>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.restaurantModel
        .find()
        .sort({ createdAt: -1 })
        .populate('type', 'name slug')
        .skip(skip)
        .limit(limit)
        .exec(),
      this.restaurantModel.countDocuments(),
    ]);

    return buildPaginatedResult(data, total, page, limit);
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
