import {
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  Delete,
  Param,
  Req,
  Query,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { RestaurantTypesService } from './restaurant-types.service';
import { FavoritesService } from './favorites.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly restaurantTypesService: RestaurantTypesService,
    private readonly favoritesService: FavoritesService,
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
    return this.restaurantsService.create(createRestaurantDto, file);
  }

  @Public()
  @Get()
  @UseInterceptors(CacheInterceptor)
  async findAll() {
    return this.restaurantsService.findAll();
  }

  @Public()
  @Get('types')
  async findAllTypes() {
    return this.restaurantTypesService.findAll();
  }

  @Get('favorites')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getFavorites(@Req() req: any) {
    const userId = req.user.userId as string;
    return this.favoritesService.getAll(userId);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.restaurantsService.findById(id);
  }

  @Post('types')
  @Public()
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
    return this.restaurantTypesService.create({ name }, file);
  }


  // Favorite Restaurants Endpoints
  @Post('favorites/:restaurantId')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async addFavorite(@Param('restaurantId') restaurantId: string, @Req() req: any) {
    const userId = req.user.userId as string;
    return this.favoritesService.add(userId, restaurantId);
  }

  @Delete('favorites/:restaurantId')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async removeFavorite(@Param('restaurantId') restaurantId: string, @Req() req: any) {
    const userId = req.user.userId as string;
    await this.favoritesService.remove(userId, restaurantId);
    return { message: 'Đã xóa khỏi danh sách yêu thích' };
  }
}
