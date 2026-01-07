import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  async create(
    @Body() createRestaurantDto: CreateRestaurantDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.restaurantsService.create(createRestaurantDto, req.user.userId);
  }

  @Get()
  async findAll() {
    return this.restaurantsService.findAll();
  }
}
