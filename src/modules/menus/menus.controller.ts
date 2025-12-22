import {
  Controller,
  Get,
  Query,
  Param,
  Delete,
  Patch,
  Post,
  Body,
} from '@nestjs/common';
import { MenusService } from './menus.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Post()
  create(@Body() createMenuItemDto: CreateMenuItemDto) {
    return this.menusService.create(createMenuItemDto);
  }

  @Get()
  findAll(@Query('restaurant_id') restaurantId: string) {
    return this.menusService.findAllByRestaurant(restaurantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menusService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ) {
    return this.menusService.update(id, updateMenuItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.menusService.remove(id);
  }

  @Get('public/:restaurantId/:tableId')
  async getMenuForGuest(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
    @Query('token') token: string,
  ) {
    return this.menusService.getMenuForClient(restaurantId, tableId, token);
  }
}
