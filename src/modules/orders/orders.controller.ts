import { Controller, Post, Body, Get, Param, Patch, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderItemStatusDto } from './dto/update-item.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.ordersService.create(createOrderDto, req.user.userId);
  }

  @Get('restaurant')
  findAllRestaurant(@Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.ordersService.findAll(req.user.restaurantId);
  }

  @Get('kitchen/:restaurantId')
  findForKitchen(@Param('restaurantId') restaurantId: string) {
    return this.ordersService.findAll(restaurantId);
  }

  @Get('client')
  findAllClient(@Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.ordersService.findAllForClient(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch()
  updateStatus(@Body() updateItemDto: UpdateOrderItemStatusDto) {
    return this.ordersService.updateOrderItemStatus(updateItemDto);
  }
}
