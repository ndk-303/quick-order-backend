import { Controller, Post, Body, Get, Param, Patch, Req, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderItemStatusDto } from './dto/update-item.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { MenuCategory } from 'src/common/enums/menu-category';
import { GeoFencingGuard } from 'src/common/guards/geocoding.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Public()
  @Post()
  // @UseGuards(GeoFencingGuard)
  create(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    // Client anonymous có thể order, userId từ session nếu có (optional)
    const userId = req.session?.user?.userId ?? null;
    const guestId = req.sessionID;
    return this.ordersService.create(createOrderDto, userId, guestId);
  }

  @Get()
  findAllRestaurant(@Req() req: any) {
    return this.ordersService.findAll(req.user.restaurantId);
  }

  @Public()
  findForKitchen(@Param('restaurantId') restaurantId: string, @Query('category') category: MenuCategory) {
    return this.ordersService.findAll(restaurantId, {}, category);
  }

  @Public()
  @Get('client')
  findAllClient(@Req() req: any, @Query('status') status: string[]) {
    // Client anonymous dùng session để track orders
    const userId = req.session?.user?.userId ?? null;
    const guestId = req.sessionID;
    return this.ordersService.findAllForClient(userId, guestId, status);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Public()
  @Patch(':orderId/items/:itemId/status')
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
