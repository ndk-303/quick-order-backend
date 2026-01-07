import { Module } from '@nestjs/common';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Table, TableSchema } from './schemas/table.schema';
import {
  Restaurant,
  RestaurantSchema,
} from '../restaurants/schemas/restaurant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Table.name, schema: TableSchema }]),
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
  ],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
