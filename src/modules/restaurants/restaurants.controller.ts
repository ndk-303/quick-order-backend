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
  Query,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Post()
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create new restaurant (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ description: 'Restaurant data with image file', type: CreateRestaurantDto })
  @ApiResponse({ status: 201, description: 'Restaurant created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all restaurants' })
  @ApiResponse({ status: 200, description: 'List of all restaurants with location and details' })
  @UseInterceptors(CacheInterceptor)
  async findAll() {
    return this.restaurantsService.findAll();
  }

  @Public()
  @Get('types')
  @ApiOperation({ summary: 'Get all restaurant types' })
  @ApiResponse({ status: 200, description: 'List of restaurant types/categories' })
  @UseInterceptors(CacheInterceptor)
  async findAllTypes() {
    return await this.restaurantsService.findAllTypes();
  }

  @Get('favorites')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get user favorite restaurants' })
  @ApiResponse({ status: 200, description: 'List of user favorite restaurants' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // 5 minutes - user favorites
  async getFavorites(@Req() req: any) {
    const userId = req.user.userId;
    return this.restaurantsService.getFavorites(userId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant by ID' })
  @ApiParam({ name: 'id', description: 'Restaurant MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Restaurant details' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  @UseInterceptors(CacheInterceptor)
  async findOne(@Param('id') id: string) {
    return this.restaurantsService.findById(id);
  }

  @Post('types')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create restaurant type (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Restaurant type created' })
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


  // Favorite Restaurants Endpoints
  @Post('favorites/:restaurantId')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Add restaurant to favorites' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID to favorite' })
  @ApiResponse({ status: 200, description: 'Added to favorites' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addFavorite(@Param('restaurantId') restaurantId: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.restaurantsService.addFavorite(userId, restaurantId);
  }

  @Delete('favorites/:restaurantId')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Remove restaurant from favorites' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID to unfavorite' })
  @ApiResponse({ status: 200, description: 'Removed from favorites' })
  async removeFavorite(@Param('restaurantId') restaurantId: string, @Req() req: any) {
    const userId = req.user.userId;
    await this.restaurantsService.removeFavorite(userId, restaurantId);
    return { message: 'Đã xóa khỏi danh sách yêu thích' };
  }


}
