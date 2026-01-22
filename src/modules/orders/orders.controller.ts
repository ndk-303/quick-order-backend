import { Controller, Post, Body, Get, Param, Patch, Req, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderItemStatusDto } from './dto/update-item.dto';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.ordersService.create(createOrderDto, req.user.userId);
  }

  @Get()
  findAllRestaurant(@Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.ordersService.findAll(req.user.restaurantId);
  }

  @Public()
  @Get('kitchen/:restaurantId')
  findForKitchen(@Param('restaurantId') restaurantId: string) {
    return this.ordersService.findAll(restaurantId);
  }

  @Get('client')
  findAllClient(@Req() req: any, @Query('status') status: string[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.ordersService.findAllForClient(req.user.userId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Public()
  @Patch()
  updateStatus(@Body() updateItemDto: UpdateOrderItemStatusDto) {
    return this.ordersService.updateOrderItemStatus(updateItemDto);
  }
}
