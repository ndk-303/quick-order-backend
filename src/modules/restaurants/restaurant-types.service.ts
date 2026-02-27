import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    RestaurantType,
    RestaurantTypeDocument,
} from './schemas/restaurant-types.schema';
import { CreateRestaurantTypeDto } from './dto/create-restaurant-type.dto';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import slugify from 'slugify';

@Injectable()
export class RestaurantTypesService {
    private readonly logger = new Logger(RestaurantTypesService.name);

    constructor(
        @InjectModel(RestaurantType.name)
        private restaurantTypeModel: Model<RestaurantTypeDocument>,
        private readonly cloudinaryService: CloudinaryService,
    ) { }

    async create(
        createTypeDto: CreateRestaurantTypeDto,
        file?: Express.Multer.File,
    ): Promise<RestaurantType> {
        const slug = slugify(createTypeDto.name, {
            lower: true,
            strict: true,
            locale: 'vi',
        });

        const exists = await this.restaurantTypeModel.findOne({ slug });
        if (exists) {
            throw new BadRequestException('Loại nhà hàng đã tồn tại');
        }

        const imageUrl = file
            ? await this.cloudinaryService.uploadRestaurantImage(file)
            : createTypeDto.imageUrl;

        this.logger.debug(`Creating restaurant type: ${createTypeDto.name} (${slug})`);

        return this.restaurantTypeModel.create({
            name: createTypeDto.name,
            slug,
            imageUrl,
        });
    }

    async findAll(): Promise<RestaurantType[]> {
        return this.restaurantTypeModel.find().select('-createdAt -updatedAt').exec();
    }

    async findBySlug(slug: string): Promise<RestaurantTypeDocument | null> {
        return this.restaurantTypeModel.findOne({ slug });
    }
}
