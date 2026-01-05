import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { MenuItem, MenuItemSchema } from './schemas/menu-item.schema';
import { RestaurantsModule } from '../restaurants/restaurants.module'; // Cần cho Guard
import { TablesModule } from '../tables/tables.module'; // Cần cho Service check token
import {
  Restaurant,
  RestaurantSchema,
} from '../restaurants/schemas/restaurant.schema';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { Table, TableSchema } from '../tables/schemas/table.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MenuItem.name, schema: MenuItemSchema },
    ]),
    MongooseModule.forFeature([{ name: Table.name, schema: TableSchema }]),
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
    RestaurantsModule,
    TablesModule,
  ],
  controllers: [MenusController],
  providers: [MenusService, CloudinaryService],
  exports: [MenusService, MongooseModule],
})
export class MenusModule {}
