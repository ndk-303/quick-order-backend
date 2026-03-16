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
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { buildPaginatedResult, PaginatedResult } from 'src/common/interfaces/paginated-result.interface';

@Injectable()
export class InvoicesService {
    constructor(
        @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
        @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
        @InjectModel(Table.name) private tableModel: Model<TableDocument>,
        @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
        private readonly sseService: SseService,
    ) { }

    async create(createInvoiceDto: CreateInvoiceDto, guestId: string) {
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
            ...(userId ? { userId: new Types.ObjectId(userId) } : {}),
            guestId,
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

    async findByUser(userId: string | null, guestId: string, pagination: PaginationDto = {}): Promise<PaginatedResult<InvoiceDocument>> {
        const page = pagination.page ?? 1;
        const limit = pagination.limit ?? 10;
        const skip = (page - 1) * limit;

        const userFilter = userId
            ? { $or: [{ userId: new Types.ObjectId(userId) }, { guestId }] }
            : { guestId };

        const filter = { ...userFilter, status: InvoiceStatus.PAID };

        const [invoices, total] = await Promise.all([
            this.invoiceModel
                .find(filter)
                .populate('restaurantId', 'name address')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.invoiceModel.countDocuments(filter),
        ]);

        return buildPaginatedResult(invoices, total, page, limit);
    }

    async findByRestaurant(restaurantId: string, pagination: PaginationDto = {}): Promise<PaginatedResult<InvoiceDocument>> {
        const page = pagination.page ?? 1;
        const limit = pagination.limit ?? 10;
        const skip = (page - 1) * limit;
        const filter = { restaurantId: new Types.ObjectId(restaurantId) };

        const [invoices, total] = await Promise.all([
            this.invoiceModel
                .find(filter)
                .populate('tableId', 'name')
                .populate('userId', 'fullName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.invoiceModel.countDocuments(filter),
        ]);

        return buildPaginatedResult(invoices, total, page, limit);
    }
}

