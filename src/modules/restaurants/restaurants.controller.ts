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
  Delete,
  Param,
  Req,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/common/services/cloudinary.service';

@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

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
      const data = {
        ...createRestaurantDto,
        imageUrl: imageUrl,
      };

      return this.restaurantsService.create(data);
    } else {
      throw new BadRequestException('Ảnh không hợp lệ');
    }
  }

  @Get()
  async findAll() {
    return this.restaurantsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.restaurantsService.findById(id);
  }

  @Post('types')
  @UseInterceptors(FileInterceptor('file'))
  async createType(
    @Body('name') name: string,
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
      const data = {
        name,
        imageUrl,
      };
      return this.restaurantsService.createRestaurantType(data);
    } else {
      throw new BadRequestException('File ảnh không hợp lệ');
    }
  }

  @Get('types')
  async findAllTypes() {
    return await this.restaurantsService.findAllTypes();
  }

  // Favorite Restaurants Endpoints
  @Post('favorites/:restaurantId')
  async addFavorite(@Param('restaurantId') restaurantId: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.restaurantsService.addFavorite(userId, restaurantId);
  }

  @Delete('favorites/:restaurantId')
  async removeFavorite(@Param('restaurantId') restaurantId: string, @Req() req: any) {
    const userId = req.user.userId;
    await this.restaurantsService.removeFavorite(userId, restaurantId);
    return { message: 'Đã xóa khỏi danh sách yêu thích' };
  }

  @Get('favorites')
  async getFavorites(@Req() req: any) {
    const userId = req.user.userId;
    return this.restaurantsService.getFavorites(userId);
  }
}
