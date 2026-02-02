import { Controller, Post, Body, Get, Param, Patch, Req, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderItemStatusDto } from './dto/update-item.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Tạo đơn hàng mới' })
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
  @ApiResponse({ status: 400, description: 'Bàn không hợp lệ hoặc dữ liệu không đúng' })
  create(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    return this.ordersService.create(createOrderDto, req.user.userId);
  }

  @Get()
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get all orders for restaurant' })
  @ApiResponse({ status: 200, description: 'List of restaurant orders' })
  findAllRestaurant(@Req() req: any) {
    return this.ordersService.findAll(req.user.restaurantId);
  }

  @Get('kitchen/:restaurantId')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get orders for kitchen display' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiResponse({ status: 200, description: 'Kitchen orders' })
  findForKitchen(@Param('restaurantId') restaurantId: string) {
    return this.ordersService.findAll(restaurantId);
  }

  @Get('client')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get orders for client' })
  @ApiQuery({ name: 'status', required: false, isArray: true, description: 'Filter by status' })
  @ApiResponse({ status: 200, description: 'Client orders' })
  findAllClient(@Req() req: any, @Query('status') status: string[]) {
    return this.ordersService.findAllForClient(req.user.userId, status);
  }

  @Get(':id')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':orderId/items/:itemId/status')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update order item status' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiParam({ name: 'itemId', description: 'Order item ID' })
  @ApiResponse({ status: 200, description: 'Order item status updated' })
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
