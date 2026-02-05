import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import { UpdateTableDto } from './dto/update-table.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('Tables')
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) { }

  @Post()
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Tạo bàn mới',
    description: 'Tạo bàn mới cho nhà hàng. Tự động gán restaurantId từ JWT token của restaurant owner.'
  })
  @ApiBody({ type: CreateTableDto })
  @ApiResponse({
    status: 201,
    description: 'Tạo bàn thành công',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
        name: { type: 'string', example: 'Bàn 5' },
        capacity: { type: 'number', example: 4 },
        restaurant: { type: 'string', example: '507f1f77bcf86cd799439012' },
        token: { type: 'string', example: 'abc123xyz' },
        qrImage: { type: 'string', example: 'https://res.cloudinary.com/...' },
        isActive: { type: 'boolean', example: true },
        location: { type: 'string', example: 'Tầng 1, khu A' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc tên bàn đã tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createTableDto: CreateTableDto, @Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.tablesService.create(createTableDto, req.user.restaurantId);
  }

  @Post(':id/qr')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Tạo mã QR cho bàn',
    description: 'Tạo hoặc tái tạo mã QR code cho bàn. QR code chứa link đến menu của bàn.'
  })
  @ApiParam({
    name: 'id',
    description: 'Table ID',
    type: String,
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({
    status: 200,
    description: 'Tạo QR code thành công',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        qrImage: { type: 'string', example: 'https://res.cloudinary.com/qr-code.png' },
        token: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Bàn không tìm thấy' })
  generateQr(@Param('id') id: string) {
    return this.tablesService.generateQrCode(id);
  }

  @Get(':id')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Lấy thông tin bàn theo ID',
    description: 'Lấy thông tin chi tiết của một bàn cụ thể'
  })
  @ApiParam({
    name: 'id',
    description: 'Table ID',
    type: String,
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin chi tiết bàn',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string', example: 'Bàn 5' },
        capacity: { type: 'number', example: 4 },
        restaurant: { type: 'string' },
        token: { type: 'string' },
        qrImage: { type: 'string' },
        isActive: { type: 'boolean', example: true },
        location: { type: 'string', example: 'Tầng 1, khu A' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Bàn không tìm thấy' })
  findOne(@Param('id') id: string) {
    return this.tablesService.findById(id);
  }

  @Get()
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Lấy danh sách bàn của nhà hàng',
    description: 'Lấy tất cả bàn của nhà hàng (tự động lọc theo restaurantId từ JWT token)'
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách bàn',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Bàn 3' },
          capacity: { type: 'number', example: 6 },
          isActive: { type: 'boolean', example: true },
          location: { type: 'string', example: 'Tầng 2' },
          qrImage: { type: 'string' }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // 5 minutes - tables list changes infrequently
  findAll(@Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.tablesService.findAllByRestaurant(req.user.restaurantId);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Cập nhật thông tin bàn',
    description: 'Cập nhật tên, sức chứa, trạng thái hoặc vị trí của bàn'
  })
  @ApiParam({
    name: 'id',
    description: 'Table ID',
    type: String,
    example: '507f1f77bcf86cd799439011'
  })
  @ApiBody({ type: UpdateTableDto })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật bàn thành công',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        capacity: { type: 'number' },
        isActive: { type: 'boolean' },
        location: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Bàn không tìm thấy' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  update(@Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.tablesService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Xóa bàn',
    description: 'Xóa bàn khỏi nhà hàng'
  })
  @ApiParam({
    name: 'id',
    description: 'Table ID',
    type: String,
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa bàn thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Đã xóa bàn thành công' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Bàn không tìm thấy' })
  remove(@Param('id') id: string) {
    return this.tablesService.remove(id);
  }
}
