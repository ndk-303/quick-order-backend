import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  Patch,
  Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './schemas/order.schema';
// import { GeoFencingGuard } from 'src/common/guards/geocoding.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  findAll(@Req() req: any, @Query('status') status?: OrderStatus) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.ordersService.findAll(req.user.restaurantId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  updateStatus(@Param('id') id: string, @Body() status: string) {
    return this.ordersService.updateStatus(id, status);
  }
}
