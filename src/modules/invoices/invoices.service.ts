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
        let totalAmount = 0;
        const invoiceItems: InvoiceItemSnapshot[] = [];

        // Calculate total amount and populate item details snapshot
        for (const item of items) {
            const menuItem = await this.menuItemModel.findById(item.menuItemId);
            if (!menuItem) {
                throw new NotFoundException(`Menu item not found: ${item.menuItemId}`);
            }

            const price = menuItem.price;
            // Add logic for options price if needed in future

            totalAmount += price * item.quantity;

            invoiceItems.push({
                menuItemId: new Types.ObjectId(item.menuItemId),
                name: menuItem.name,
                price: price,
                quantity: item.quantity,
                note: item.note,
            });
        }

        const newInvoice = this.invoiceModel.create({
            ...rest,
            userId: new Types.ObjectId(createInvoiceDto.userId),
            restaurantId: new Types.ObjectId(createInvoiceDto.restaurantId),
            tableId: new Types.ObjectId(createInvoiceDto.tableId),
            items: invoiceItems,
            totalAmount,
            status: InvoiceStatus.PENDING,
        });

        return newInvoice;
    }

    async findOne(id: string): Promise<InvoiceDocument> {
        const invoice = await this.invoiceModel
            .findById(id)
            .populate('restaurantId', 'name address')
            .populate('tableId', 'name')
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

    async findByUser(userId: string) {
        const invoices = await this.invoiceModel
            .find({ userId: new Types.ObjectId(userId), status: InvoiceStatus.PAID })
            .populate('restaurantId', 'name address')
            .sort({ createdAt: -1 }) // Newest first
            .exec();
        console.log(invoices);
        return invoices;
    }
}

