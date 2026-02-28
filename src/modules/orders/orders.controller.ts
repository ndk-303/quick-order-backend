import { Controller, Post, Body, Get, Param, Patch, Req, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderItemStatusDto } from './dto/update-item.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { MenuCategory } from 'src/common/enums/menu-category';
import { GeoFencingGuard } from 'src/common/guards/geocoding.guard';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  @UseGuards(GeoFencingGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Tạo đơn hàng mới',
    description: 'Tạo đơn hàng mới cho khách hàng. Yêu cầu thông tin nhà hàng, bàn, danh sách món ăn và vị trí GPS của khách hàng.'
  })
  @ApiResponse({
    status: 201,
    description: 'Đặt hàng thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Đặt hàng thành công' },
        orderId: { type: 'string', example: '507f1f77bcf86cd799439011' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bàn không hợp lệ hoặc dữ liệu không đúng',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Bàn không hợp lệ hoặc không hoạt động' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token không hợp lệ' })
  create(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    return this.ordersService.create(createOrderDto, req.user.userId);
  }

  @Get()
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Lấy tất cả đơn hàng của nhà hàng',
    description: 'Lấy danh sách tất cả đơn hàng của nhà hàng (dành cho restaurant owner/admin). Tự động lọc theo restaurantId từ JWT token.'
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách đơn hàng',
    schema: {
      type: 'object',
      properties: {
        orders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
              restaurantId: { type: 'string', example: '507f1f77bcf86cd799439012' },
              tableId: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string', example: 'Bàn 5' }
                }
              },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    menuItemId: { type: 'string' },
                    name: { type: 'string', example: 'Phở bò' },
                    price: { type: 'number', example: 65000 },
                    quantity: { type: 'number', example: 2 },
                    selectedOptions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string', example: 'Size L' },
                          price: { type: 'number', example: 5000 }
                        }
                      }
                    },
                    status: { type: 'string', enum: ['PENDING', 'COOKING', 'COMPLETED', 'CANCELED'], example: 'COOKING' },
                    category: { type: 'string', enum: ['FOOD', 'DRINK', 'DESSERT'], example: 'FOOD' }
                  }
                }
              },
              totalAmount: { type: 'number', example: 130000 },
              status: { type: 'string', enum: ['PENDING', 'COOKING', 'COMPLETED', 'CANCELED'], example: 'COOKING' }
            }
          }
        },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
        total: { type: 'number', example: 100 }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAllRestaurant(@Req() req: any) {
    return this.ordersService.findAll(req.user.restaurantId);
  }

  @Public()
  @Get('kitchen/:restaurantId')
  @ApiOperation({
    summary: 'Lấy đơn hàng cho màn hình bếp',
    description: 'Lấy danh sách đơn hàng đang chờ và đang nấu cho màn hình kitchen display. Có thể lọc theo category (FOOD/DRINK/DESSERT). Chỉ trả về orders có status PENDING hoặc COOKING.'
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'ID của nhà hàng',
    type: String,
    example: '507f1f77bcf86cd799439011'
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['FOOD', 'DRINK', 'DESSERT'],
    description: 'Lọc món ăn theo category',
    example: 'FOOD'
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách đơn hàng cho bếp',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          tableId: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string', example: 'Bàn 3' }
            }
          },
          items: {
            type: 'array',
            description: 'Chỉ chứa items thuộc category được filter (nếu có)',
            items: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                menuItemId: { type: 'string' },
                name: { type: 'string', example: 'Cơm gà' },
                price: { type: 'number', example: 45000 },
                quantity: { type: 'number', example: 1 },
                selectedOptions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      price: { type: 'number' }
                    }
                  }
                },
                status: { type: 'string', enum: ['PENDING', 'COOKING'], example: 'PENDING' },
                category: { type: 'string', enum: ['FOOD', 'DRINK', 'DESSERT'], example: 'FOOD' },
                note: { type: 'string', example: 'Không hành' }
              }
            }
          },
          status: { type: 'string', enum: ['PENDING', 'COOKING'], example: 'PENDING' }
        }
      }
    }
  })
  findForKitchen(@Param('restaurantId') restaurantId: string, @Query('category') category: MenuCategory) {
    return this.ordersService.findAll(restaurantId, {}, category);
  }

  @Get('client')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Lấy đơn hàng của khách hàng',
    description: 'Lấy danh sách đơn hàng của khách hàng đang đăng nhập. Có thể lọc theo status (PENDING, COOKING, COMPLETED, CANCELED).'
  })
  @ApiQuery({
    name: 'status',
    required: false,
    isArray: true,
    enum: ['PENDING', 'COOKING', 'COMPLETED', 'CANCELED'],
    description: 'Lọc theo trạng thái đơn hàng. Có thể truyền nhiều status.',
    example: ['PENDING', 'COOKING']
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách đơn hàng của khách',
    schema: {
      type: 'object',
      properties: {
        orders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              restaurantId: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string', example: 'Nhà hàng ABC' }
                }
              },
              tableId: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string', example: 'Bàn 7' }
                }
              },
              items: { type: 'array' },
              totalAmount: { type: 'number', example: 250000 },
              status: { type: 'string', example: 'COOKING' }
            }
          }
        },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
        total: { type: 'number', example: 100 }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAllClient(@Req() req: any, @Query('status') status: string[]) {
    return this.ordersService.findAllForClient(req.user.userId, status);
  }

  @Get(':id')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Lấy chi tiết đơn hàng theo ID',
    description: 'Lấy thông tin chi tiết của một đơn hàng cụ thể'
  })
  @ApiParam({
    name: 'id',
    description: 'Order ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết đơn hàng',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        userId: { type: 'string' },
        restaurantId: { type: 'string' },
        tableId: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              menuItemId: { type: 'string' },
              name: { type: 'string' },
              price: { type: 'number' },
              quantity: { type: 'number' },
              selectedOptions: { type: 'array' },
              note: { type: 'string' },
              status: { type: 'string', enum: ['PENDING', 'COOKING', 'COMPLETED', 'CANCELED'] },
              category: { type: 'string', enum: ['FOOD', 'DRINK', 'DESSERT'] }
            }
          }
        },
        totalAmount: { type: 'number' },
        status: { type: 'string', enum: ['PENDING', 'COOKING', 'COMPLETED', 'CANCELED'] }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Public()
  @Patch(':orderId/items/:itemId/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái món ăn trong đơn',
    description: 'Cập nhật trạng thái của một món ăn cụ thể trong đơn hàng (dành cho kitchen staff). Chỉ cho phép cập nhật tiến: PENDING → COOKING → COMPLETED. CANCELED chỉ có thể set từ PENDING.'
  })
  @ApiParam({
    name: 'orderId',
    description: 'ID của đơn hàng',
    type: String,
    example: '507f1f77bcf86cd799439011'
  })
  @ApiParam({
    name: 'itemId',
    description: 'ID của món ăn trong đơn (menuItemId)',
    type: String,
    example: '507f1f77bcf86cd799439012'
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật trạng thái thành công',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        items: {
          type: 'array',
          description: 'Danh sách items với status đã được cập nhật'
        },
        status: {
          type: 'string',
          description: 'Status tổng thể của order (tự động tính toán dựa trên status của các items)',
          enum: ['PENDING', 'COOKING', 'COMPLETED', 'CANCELED']
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Không thể cập nhật trạng thái',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Không thể cập nhật trạng thái lùi từ COOKING về PENDING. Chỉ được phép cập nhật tiến.'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Order hoặc item không tìm thấy' })
  updateStatus(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() updateItemDto: UpdateOrderItemStatusDto,
  ) {
    return this.ordersService.updateOrderItemStatus({
      ...updateItemDto,
      orderId,
      itemId,
    });
  }
}
