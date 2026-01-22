import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { MenuItem, MenuItemSchema } from '../menus/schemas/menu-item.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Invoice.name, schema: InvoiceSchema },
            { name: MenuItem.name, schema: MenuItemSchema },
        ]),
    ],
    controllers: [InvoicesController],
    providers: [InvoicesService],
    exports: [InvoicesService], // Export so PaymentsModule/OrdersModule can use it
})
export class InvoicesModule { }
