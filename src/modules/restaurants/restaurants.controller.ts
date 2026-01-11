import {
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { CreateRestaurantTypeDto } from './dto/create-restaurant-type.dto';

@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Public()
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createRestaurantDto: CreateRestaurantDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' })],
        fileIsRequired: false,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (file) {
      const imageUrl = await this.cloudinaryService.uploadRestaurantImage(file);
      return imageUrl;
      const data = {
        ...createRestaurantDto,
        imageUrl: imageUrl,
      };

      return this.restaurantsService.create(data);
    } else {
      throw new BadRequestException('Ảnh không hợp lệ');
    }
  }

  // @Public()
  // @Post('/create')
  // async cr() {
  //   return await this.restaurantsService.createAll();
  // }

  @Public()
  @Get()
  async findAll() {
    return this.restaurantsService.findAll();
  }

  @Post('type')
  async createType(createTypeDto: CreateRestaurantTypeDto) {
    return this.restaurantsService.createRestaurantType(createTypeDto);
  }
}
