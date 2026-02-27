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
import { RestaurantTypesService } from './restaurant-types.service';
import { FavoritesService } from './favorites.service';
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
    private readonly restaurantTypesService: RestaurantTypesService,
    private readonly favoritesService: FavoritesService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Post()
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Tạo nhà hàng mới (Admin only)',
    description: 'Tạo nhà hàng mới với thông tin chi tiết và hình ảnh. Yêu cầu quyền admin.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Dữ liệu nhà hàng kèm file ảnh',
    type: CreateRestaurantDto
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo nhà hàng thành công',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
        name: { type: 'string', example: 'Cơm Tấm Sườn Nướng Ngon' },
        address: { type: 'string', example: '123 Nguyễn Huệ, Quận 1, TP.HCM' },
        location: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'Point' },
            coordinates: { type: 'array', items: { type: 'number' }, example: [106.6297, 10.8231] }
          }
        },
        imageUrl: { type: 'string', example: 'https://res.cloudinary.com/...' },
        rating: { type: 'number', example: 4.5 },
        review: { type: 'number', example: 128 },
        priceRange: { type: 'string', example: '50,000 - 200,000 VNĐ' },
        type: { type: 'string', example: '507f1f77bcf86cd799439011' },
        openTime: { type: 'string', example: '08:00 - 22:00' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc thiếu file ảnh' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Yêu cầu quyền admin' })
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
  @ApiOperation({
    summary: 'Lấy danh sách tất cả nhà hàng',
    description: 'Lấy danh sách tất cả nhà hàng với thông tin vị trí, đánh giá và chi tiết. Public endpoint, không cần authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách nhà hàng',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Nhà hàng ABC' },
          address: { type: 'string', example: '123 Nguyễn Huệ, Q1' },
          location: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'Point' },
              coordinates: { type: 'array', items: { type: 'number' } }
            }
          },
          imageUrl: { type: 'string' },
          rating: { type: 'number', example: 4.5 },
          review: { type: 'number', example: 128 },
          priceRange: { type: 'string', example: '50,000 - 200,000 VNĐ' },
          type: { type: 'string' },
          openTime: { type: 'string', example: '08:00 - 22:00' }
        }
      }
    }
  })
  @UseInterceptors(CacheInterceptor)
  async findAll() {
    return this.restaurantsService.findAll();
  }

  @Public()
  @Get('types')
  @ApiOperation({
    summary: 'Lấy danh sách loại hình nhà hàng',
    description: 'Lấy tất cả các loại hình/danh mục nhà hàng (ví dụ: Cơm, Phở, Lẩu, v.v.)'
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách loại hình nhà hàng',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Cơm' },
          imageUrl: { type: 'string' }
        }
      }
    }
  })
  @UseInterceptors(CacheInterceptor)
  async findAllTypes() {
    return this.restaurantTypesService.findAll();
  }

  @Get('favorites')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Lấy danh sách nhà hàng yêu thích',
    description: 'Lấy danh sách các nhà hàng mà người dùng đã đánh dấu yêu thích'
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách nhà hàng yêu thích',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          address: { type: 'string' },
          imageUrl: { type: 'string' },
          rating: { type: 'number' },
          review: { type: 'number' },
          priceRange: { type: 'string' }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getFavorites(@Req() req: any) {
    const userId = req.user.userId as string;
    return this.favoritesService.getAll(userId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Lấy thông tin nhà hàng theo ID',
    description: 'Lấy thông tin chi tiết của một nhà hàng cụ thể'
  })
  @ApiParam({
    name: 'id',
    description: 'Restaurant ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin chi tiết nhà hàng',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        address: { type: 'string' },
        location: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'Point' },
            coordinates: { type: 'array', items: { type: 'number' } }
          }
        },
        imageUrl: { type: 'string' },
        rating: { type: 'number' },
        review: { type: 'number' },
        priceRange: { type: 'string' },
        type: { type: 'string' },
        openTime: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Nhà hàng không tìm thấy' })
  @UseInterceptors(CacheInterceptor)
  async findOne(@Param('id') id: string) {
    return this.restaurantsService.findById(id);
  }

  @Post('types')
  @Public()
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
      return this.restaurantTypesService.create({ name, imageUrl });
    } else {
      throw new BadRequestException('File ảnh không hợp lệ');
    }
  }


  // Favorite Restaurants Endpoints
  @Post('favorites/:restaurantId')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Thêm nhà hàng vào danh sách yêu thích',
    description: 'Đánh dấu một nhà hàng là yêu thích cho người dùng hiện tại'
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'ID của nhà hàng cần thêm vào yêu thích',
    type: String,
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({
    status: 200,
    description: 'Đã thêm vào danh sách yêu thích',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Đã thêm vào danh sách yêu thích' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Nhà hàng không tìm thấy' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async addFavorite(@Param('restaurantId') restaurantId: string, @Req() req: any) {
    const userId = req.user.userId as string;
    return this.favoritesService.add(userId, restaurantId);
  }

  @Delete('favorites/:restaurantId')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Xóa nhà hàng khỏi danh sách yêu thích',
    description: 'Bỏ đánh dấu yêu thích cho một nhà hàng'
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'ID của nhà hàng cần xóa khỏi yêu thích',
    type: String,
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({
    status: 200,
    description: 'Đã xóa khỏi danh sách yêu thích',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Đã xóa khỏi danh sách yêu thích' }
      }
    }
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async removeFavorite(@Param('restaurantId') restaurantId: string, @Req() req: any) {
    const userId = req.user.userId as string;
    await this.favoritesService.remove(userId, restaurantId);
    return { message: 'Đã xóa khỏi danh sách yêu thích' };
  }


}
