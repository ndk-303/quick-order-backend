import {
  Controller,
  Get,
  Param,
  Delete,
  Patch,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  FileTypeValidator,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MenusService } from './menus.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuFilterDto } from './dto/menu-filter.dto';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { GeoFencingGuard } from 'src/common/guards/geocoding.guard';

@ApiTags('Menus')
@Controller('menus')
export class MenusController {
  constructor(
    private readonly menusService: MenusService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Post()
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create menu item (Restaurant owner)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Menu item created' })
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Req() req: any,
    @Body() createMenuItemDto: CreateMenuItemDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' })],
        fileIsRequired: false,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (file) {
      const imageUrl = await this.cloudinaryService.uploadMenuImage(file);
      return this.menusService.create(
        req.user.restaurantId,
        createMenuItemDto,
        imageUrl,
      );
    } else {
      throw new BadRequestException('File ảnh không hợp lệ');
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get menu item by ID' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Menu item details' })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600000) // 10 minutes
  findOne(@Param('id') id: string) {
    return this.menusService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Menu item updated' })
  update(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ) {
    return this.menusService.update(id, updateMenuItemDto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Delete menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Menu item deleted' })
  remove(@Param('id') id: string) {
    return this.menusService.remove(id);
  }

  @Public()
  @Get(':restaurantId/:tableId')
  @ApiOperation({
    summary: 'Get menu for guest with optional filters (public endpoint)',
    description: 'Retrieve menu items for a specific restaurant and table. Supports filtering by category, price range, and search. Only returns available menu items (isAvailable: true).'
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'Restaurant ID',
    type: String,
    example: '507f1f77bcf86cd799439011'
  })
  @ApiParam({
    name: 'tableId',
    description: 'Table ID',
    type: String,
    example: '507f1f77bcf86cd799439012'
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['food', 'drink', 'desert'],
    description: 'Filter by menu category',
    example: 'food'
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Minimum price filter',
    example: 50000
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Maximum price filter',
    example: 200000
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search menu items by name (case-insensitive)',
    example: 'phở'
  })
  @ApiQuery({
    name: 'isAvailable',
    required: false,
    type: Boolean,
    description: 'Filter by availability (ignored for client - always returns only available items)',
    example: true
  })
  @ApiResponse({
    status: 200,
    description: 'Menu retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        table: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
            name: { type: 'string', example: 'Table 5' },
            isActive: { type: 'boolean', example: true },
            restaurant: {
              type: 'object',
              properties: {
                _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                name: { type: 'string', example: 'Nhà hàng ABC' }
              }
            }
          }
        },
        menu: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '507f1f77bcf86cd799439013' },
              name: { type: 'string', example: 'Phở bò' },
              description: { type: 'string', example: 'Phở bò truyền thống Hà Nội' },
              price: { type: 'number', example: 65000 },
              imageUrl: { type: 'string', example: 'https://example.com/pho.jpg' },
              isAvailable: { type: 'boolean', example: true },
              category: { type: 'string', enum: ['food', 'drink', 'desert'], example: 'food' },
              options: { type: 'array', items: { type: 'object' } }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid table or table is inactive' })
  @ApiResponse({ status: 404, description: 'Restaurant or table not found' })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  @UseGuards(GeoFencingGuard)
  async getMenuForGuest(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
    @Body() body: { lat: number, long: number },
    @Query() filters: MenuFilterDto,
  ) {
    return this.menusService.getMenuForClient(restaurantId, tableId, filters);
  }

  @Get()
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get menu for restaurant admin with optional filters',
    description: 'Retrieve all menu items for the authenticated restaurant admin. Supports filtering by category, price range, availability status, and search.'
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['food', 'drink', 'desert'],
    description: 'Filter by menu category',
    example: 'drink'
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Minimum price filter',
    example: 20000
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Maximum price filter',
    example: 150000
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search menu items by name (case-insensitive)',
    example: 'cà phê'
  })
  @ApiQuery({
    name: 'isAvailable',
    required: false,
    type: Boolean,
    description: 'Filter by availability status. If not specified, returns all items regardless of availability.',
    example: false
  })
  @ApiResponse({
    status: 200,
    description: 'Menu retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Lấy menu thành công' },
        menu: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '507f1f77bcf86cd799439013' },
              name: { type: 'string', example: 'Cà phê sữa đá' },
              description: { type: 'string', example: 'Cà phê phin truyền thống' },
              price: { type: 'number', example: 25000 },
              imageUrl: { type: 'string', example: 'https://example.com/coffee.jpg' },
              isAvailable: { type: 'boolean', example: true },
              category: { type: 'string', enum: ['food', 'drink', 'desert'], example: 'drink' },
              options: { type: 'array', items: { type: 'object' } }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120000) // 2 minutes - admin needs fresher data
  async getMenuForAdmin(
    @Req() req: any,
    @Query() filters: MenuFilterDto,
  ) {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('Tài khoản chưa được liên kết với nhà hàng nào');
    }
    return this.menusService.getMenuForAdmin(restaurantId, filters);
  }
}
