import {
  Controller,
  Get,
  Query,
  Param,
  Delete,
  Patch,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { MenusService } from './menus.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { GeoFencingGuard } from 'src/common/guards/geocoding.guard';

@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Post()
  create(@Body() createMenuItemDto: CreateMenuItemDto) {
    return this.menusService.create(createMenuItemDto);
  }

  @UseGuards(GeoFencingGuard)
  @Get('public/:restaurantId/:tableId')
  async getMenu(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
    @Query('token') token: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Query('lat') lat: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Query('long') long: string,
  ) {
    return this.menusService.getMenuForClient(restaurantId, tableId, token);
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
