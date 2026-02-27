import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    RestaurantType,
    RestaurantTypeDocument,
} from './schemas/restaurant-types.schema';
import { CreateRestaurantTypeDto } from './dto/create-restaurant-type.dto';
import slugify from 'slugify';

@Injectable()
export class RestaurantTypesService {
    private readonly logger = new Logger(RestaurantTypesService.name);

    constructor(
        @InjectModel(RestaurantType.name)
        private restaurantTypeModel: Model<RestaurantTypeDocument>,
    ) { }

    async create(createTypeDto: CreateRestaurantTypeDto): Promise<RestaurantType> {
        const slug = slugify(createTypeDto.name, {
            lower: true,
            strict: true,
            locale: 'vi',
        });

        const exists = await this.restaurantTypeModel.findOne({ slug });
        if (exists) {
            throw new BadRequestException('Loại nhà hàng đã tồn tại');
        }

        this.logger.debug(`Creating restaurant type: ${createTypeDto.name} (${slug})`);

        return this.restaurantTypeModel.create({
            name: createTypeDto.name,
            slug,
            imageUrl: createTypeDto.imageUrl,
        });
    }

    async findAll(): Promise<RestaurantType[]> {
        return this.restaurantTypeModel.find().select('-createdAt -updatedAt').exec();
    }

    async findBySlug(slug: string): Promise<RestaurantTypeDocument | null> {
        return this.restaurantTypeModel.findOne({ slug });
    }
}
