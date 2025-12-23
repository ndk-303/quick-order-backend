import { Module } from '@nestjs/common';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuItem, MenuItemSchema } from './schemas/menu-item.schema';
import { Table, TableSchema } from '../tables/schemas/table.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MenuItem.name, schema: MenuItemSchema },
    ]),
    MongooseModule.forFeature([{ name: Table.name, schema: TableSchema }]),
  ],
  providers: [MenusService],
  controllers: [MenusController],
})
export class MenusModule {}
