import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument, InvoiceItemSnapshot, InvoiceStatus } from './schemas/invoice.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { MenuItem, MenuItemDocument } from '../menus/schemas/menu-item.schema';
import { Table, TableDocument } from '../tables/schemas/table.schema';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { Order, OrderDocument, OrderStatus } from '../orders/schemas/order.schema';

@Injectable()
export class InvoicesService {
    constructor(
        @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
        @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
        @InjectModel(Table.name) private tableModel: Model<TableDocument>,
        @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
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

        // 2. Check existing orders for table reuse
        const existingOrders = await this.orderModel.find({
            userId: new Types.ObjectId(userId),
            tableId: new Types.ObjectId(tableId)
        });

        if (!table.isActive && !existingOrders) {
            throw new BadRequestException('Bàn không hoạt động!');
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

            // 4. Validate options
            if (itemDto.selectedOptions && itemDto.selectedOptions.length > 0) {
                // Check if menu item supports options
                if (!dbItem.options || dbItem.options.length === 0) {
                    throw new BadRequestException(
                        `Món ăn "${dbItem.name}" không hỗ trợ tùy chọn`
                    );
                }

                // Check for duplicate options
                const optionNames = itemDto.selectedOptions.map(opt => opt.name);
                const uniqueNames = new Set(optionNames);
                if (optionNames.length !== uniqueNames.size) {
                    throw new BadRequestException('Không được chọn trùng lặp tùy chọn');
                }

                // Validate each option exists and is active
                const availableOptions = dbItem.options.flatMap(config => config.options);
                for (const selectedOpt of itemDto.selectedOptions) {
                    const matchedOption = availableOptions.find(
                        opt => opt.name === selectedOpt.name && opt.price === selectedOpt.price
                    );

                    if (!matchedOption) {
                        throw new BadRequestException(
                            `Tùy chọn "${selectedOpt.name}" không tồn tại cho món này`
                        );
                    }

                    if (!matchedOption.isActive) {
                        throw new BadRequestException(
                            `Tùy chọn "${selectedOpt.name}" hiện không khả dụng`
                        );
                    }
                }
            }

            // Calculate total with options
            const optionsPrice = itemDto.selectedOptions?.reduce(
                (sum, opt) => sum + opt.price, 0
            ) || 0;
            const itemTotalPrice = dbItem.price + optionsPrice;
            const lineTotal = itemTotalPrice * itemDto.quantity;
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

