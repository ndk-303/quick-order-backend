import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
    FavoriteRestaurant,
    FavoriteRestaurantDocument,
} from './schemas/favorite-restaurant.schema';
import { Restaurant, RestaurantDocument } from './schemas/restaurant.schema';

@Injectable()
export class FavoritesService {
    private readonly logger = new Logger(FavoritesService.name);

    constructor(
        @InjectModel(FavoriteRestaurant.name)
        private favoriteRestaurantModel: Model<FavoriteRestaurantDocument>,
        @InjectModel(Restaurant.name)
        private restaurantModel: Model<RestaurantDocument>,
    ) { }

    async add(userId: string, restaurantId: string): Promise<FavoriteRestaurant> {
        if (!Types.ObjectId.isValid(restaurantId)) {
            throw new BadRequestException('Restaurant ID không hợp lệ');
        }

        const restaurant = await this.restaurantModel.findById(restaurantId);
        if (!restaurant) {
            throw new NotFoundException('Nhà hàng không tồn tại');
        }

        const existing = await this.favoriteRestaurantModel.findOne({
            userId: new Types.ObjectId(userId),
            restaurantId: new Types.ObjectId(restaurantId),
        });

        if (existing) {
            throw new BadRequestException('Nhà hàng đã có trong danh sách yêu thích');
        }

        this.logger.debug(`User ${userId} adding restaurant ${restaurantId} to favorites`);

        const favorite = new this.favoriteRestaurantModel({
            userId: new Types.ObjectId(userId),
            restaurantId: new Types.ObjectId(restaurantId),
        });

        return favorite.save();
    }

    async remove(userId: string, restaurantId: string): Promise<void> {
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

        this.logger.debug(`User ${userId} removed restaurant ${restaurantId} from favorites`);
    }

    async getAll(userId: string): Promise<Restaurant[]> {
        const favorites = await this.favoriteRestaurantModel
            .find({ userId: new Types.ObjectId(userId) })
            .populate('restaurantId')
            .sort({ createdAt: -1 })
            .select('restaurantId')
            .exec();

        return favorites.map((f) => f.restaurantId as unknown as Restaurant);
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
