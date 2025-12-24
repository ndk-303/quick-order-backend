import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { MenuItem, MenuItemSchema } from './schemas/menu-item.schema';
import { RestaurantsModule } from '../restaurants/restaurants.module'; // Cần cho Guard
import { TablesModule } from '../tables/tables.module'; // Cần cho Service check token

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MenuItem.name, schema: MenuItemSchema },
    ]),
    RestaurantsModule,
    TablesModule,
  ],
  controllers: [MenusController],
  providers: [MenusService],
  exports: [MenusService, MongooseModule],
})
export class MenusModule {}
