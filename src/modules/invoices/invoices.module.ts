import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { MenuItem, MenuItemSchema } from '../menus/schemas/menu-item.schema';
import { Table, TableSchema } from '../tables/schemas/table.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { RestaurantsModule } from '../restaurants/restaurants.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Invoice.name, schema: InvoiceSchema },
            { name: MenuItem.name, schema: MenuItemSchema },
            { name: Table.name, schema: TableSchema },
            { name: Restaurant.name, schema: RestaurantSchema },
        ]),
        RestaurantsModule,
    ],
    controllers: [InvoicesController],
    providers: [InvoicesService],
    exports: [InvoicesService],
})
export class InvoicesModule { }
