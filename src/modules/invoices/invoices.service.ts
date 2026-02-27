import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument, InvoiceItemSnapshot, InvoiceStatus } from './schemas/invoice.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { MenuItem, MenuItemDocument } from '../menus/schemas/menu-item.schema';
import { Table, TableDocument } from '../tables/schemas/table.schema';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { SseService } from '../sse/sse.service';
import { SseEventType } from 'src/common/interfaces/sse.interface';
import { validateMenuItemOptions, calculateItemTotal } from 'src/common/utils/order-item.util';

@Injectable()
export class InvoicesService {
    constructor(
        @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
        @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
        @InjectModel(Table.name) private tableModel: Model<TableDocument>,
        @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
        private readonly sseService: SseService,
    ) { }

    async create(createInvoiceDto: CreateInvoiceDto) {
        const { restaurantId, tableId, items, userId } = createInvoiceDto;

        // 1. Validate restaurant and table
        const [restaurant, table] = await Promise.all([
            this.restaurantModel.findById(restaurantId),
            this.tableModel.findById(tableId),
        ]);

        if (!restaurant) {
            throw new BadRequestException('Nhà hàng không hợp lệ!');
        }

        if (!table) {
            throw new BadRequestException('Bàn không hợp lệ!');
        }

        // 3. Fetch menu items (only available ones)
        const menuItemIds = items.map((item) => item.menuItemId);
        const menuItems = await this.menuItemModel.find({
            _id: { $in: menuItemIds },
            isAvailable: true,
        });

        const menuItemMap = new Map(
            menuItems.map((item) => [item._id.toString(), item])
        );

        let totalAmount = 0;
        const invoiceItems: InvoiceItemSnapshot[] = [];

        for (const itemDto of items) {
            const dbItem = menuItemMap.get(itemDto.menuItemId);
            if (!dbItem) {
                throw new BadRequestException(
                    `Món ăn với ID ${itemDto.menuItemId} không tồn tại`
                );
            }

            // Validate options using shared util
            validateMenuItemOptions(dbItem, itemDto.selectedOptions);

            // Calculate total with options
            const { lineTotal } = calculateItemTotal(
                dbItem.price,
                itemDto.quantity,
                itemDto.selectedOptions,
            );
            totalAmount += lineTotal;

            invoiceItems.push({
                menuItemId: dbItem._id,
                name: dbItem.name,
                price: dbItem.price,
                quantity: itemDto.quantity,
                selectedOptions: itemDto.selectedOptions || [],
                note: itemDto.note,
                category: itemDto.category,
            });
        }

        const newInvoice = await this.invoiceModel.create({
            userId: new Types.ObjectId(userId),
            restaurantId: new Types.ObjectId(restaurantId),
            tableId: new Types.ObjectId(tableId),
            items: invoiceItems,
            totalAmount,
            status: InvoiceStatus.PENDING,
        });

        // Populate for SSE payload
        const populatedInvoice = await this.invoiceModel
            .findById(newInvoice._id)
            .populate('tableId', 'name')
            .populate('userId', 'fullName email')
            .exec();

        this.sseService.emit({
            type: SseEventType.INVOICE_CREATED,
            restaurantId: restaurantId.toString(),
            userId: userId?.toString(),
            payload: populatedInvoice,
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
            .populate('tableId', 'name')
            .populate('userId', 'fullName email')
            .exec();

        if (!invoice) {
            throw new NotFoundException(`Invoice #${id} not found`);
        }

        this.sseService.emit({
            type: SseEventType.INVOICE_STATUS_UPDATED,
            restaurantId: invoice.restaurantId.toString(),
            userId: invoice.userId?.toString(),
            payload: invoice,
        });

        return invoice;
    }

    async findByUser(userId: string) {
        const invoices = await this.invoiceModel
            .find({ userId: new Types.ObjectId(userId), status: InvoiceStatus.PAID })
            .populate('restaurantId', 'name address')
            .sort({ createdAt: -1 })
            .exec();
        return invoices;
    }

    async findByRestaurant(restaurantId: string) {
        return this.invoiceModel
            .find({ restaurantId: new Types.ObjectId(restaurantId) })
            .populate('tableId', 'name')
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 })
            .exec();
    }
}

