import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument, InvoiceItemSnapshot, InvoiceStatus } from './schemas/invoice.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { MenuItem, MenuItemDocument } from '../menus/schemas/menu-item.schema';

@Injectable()
export class InvoicesService {
    constructor(
        @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
        @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    ) { }

    async create(createInvoiceDto: CreateInvoiceDto) {
        const { items, ...rest } = createInvoiceDto;
        let total_amount = 0;
        const invoiceItems: InvoiceItemSnapshot[] = [];

        // Calculate total amount and populate item details snapshot
        for (const item of items) {
            const menuItem = await this.menuItemModel.findById(item.menu_item_id);
            if (!menuItem) {
                throw new NotFoundException(`Menu item not found: ${item.menu_item_id}`);
            }

            const price = menuItem.price;
            // Add logic for options price if needed in future

            total_amount += price * item.quantity;

            invoiceItems.push({
                menu_item_id: new Types.ObjectId(item.menu_item_id),
                name: menuItem.name,
                price: price,
                quantity: item.quantity,
                note: item.note,
            });
        }

        const newInvoice = this.invoiceModel.create({
            ...rest,
            user_id: new Types.ObjectId(createInvoiceDto.user_id),
            restaurant_id: new Types.ObjectId(createInvoiceDto.restaurant_id),
            table_id: new Types.ObjectId(createInvoiceDto.table_id),
            items: invoiceItems,
            total_amount,
            status: InvoiceStatus.PENDING,
        });

        return newInvoice;
    }

    async findOne(id: string): Promise<InvoiceDocument> {
        const invoice = await this.invoiceModel
            .findById(id)
            .populate('restaurant_id', 'name address')
            .populate('table_id', 'name')
            .exec();

        if (!invoice) {
            throw new NotFoundException(`Invoice #${id} not found`);
        }
        return invoice;
    }

    async updateStatus(id: string, status: InvoiceStatus): Promise<InvoiceDocument> {
        const invoice = await this.invoiceModel
            .findByIdAndUpdate(id, { status }, { new: true })
            .exec();

        if (!invoice) {
            throw new NotFoundException(`Invoice #${id} not found`);
        }
        return invoice;
    }
}
