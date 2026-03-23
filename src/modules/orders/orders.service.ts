import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Order,
  OrderDocument,
  OrderItemSnapshot,
  OrderStatus,
} from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  MenuItem,
  MenuItemDocument,
} from '../../modules/menus/schemas/menu-item.schema';
import {
  Table,
  TableDocument,
} from '../../modules/tables/schemas/table.schema';
import { SseService } from '../sse/sse.service';
import { SseEventType } from 'src/common/interfaces/sse.interface';
import { UpdateOrderItemStatusDto } from './dto/update-item.dto';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { MenuCategory } from 'src/common/enums/menu-category';
import { validateMenuItemOptions, calculateItemTotal } from 'src/common/utils/order-item.util';
import { OnEvent } from '@nestjs/event-emitter';
import { InvoicePaidEvent } from 'src/common/events/invoice-paid.event';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { buildPaginatedResult, PaginatedResult } from 'src/common/interfaces/paginated-result.interface';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    private readonly sseService: SseService,
  ) { }

  async create(createOrderDto: CreateOrderDto, userId: string | null, guestId: string) {
    const { restaurantId, tableId, items } = createOrderDto;
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

    const userFilter = userId
      ? { $or: [{ userId: new Types.ObjectId(userId) }, { guestId }] }
      : { guestId };

    const existingOrders = await this.orderModel.find({
      ...userFilter,
      tableId: new Types.ObjectId(tableId)
    });
    this.logger.debug(`Found ${existingOrders.length} existing order(s) for table ${tableId}`);

    const menuItemIds = items.map((item) => item.menuItemId);
    const menuItems = await this.menuItemModel.find({
      _id: { $in: menuItemIds },
      isAvailable: true,
    });

    const menuItemMap = new Map(
      menuItems.map((item) => [item._id.toString(), item])
    );
    let totalAmount = 0;
    const snapshotItems: OrderItemSnapshot[] = [];

    for (const itemDto of items) {
      const dbItem = menuItemMap.get(itemDto.menuItemId);
      if (!dbItem) {
        throw new BadRequestException(
          `Món ăn với ID ${itemDto.menuItemId} không tồn tại`
        );
      }

      // Validate selected options using shared util
      validateMenuItemOptions(dbItem, itemDto.selectedOptions);

      const { lineTotal } = calculateItemTotal(
        dbItem.price,
        itemDto.quantity,
        itemDto.selectedOptions,
      );
      totalAmount += lineTotal;

      snapshotItems.push({
        menuItemId: dbItem._id,
        name: dbItem.name,
        price: dbItem.price,
        quantity: itemDto.quantity,
        selectedOptions: itemDto.selectedOptions || [],
        note: itemDto.note,
        imageUrl: dbItem.imageUrl,
        status: OrderStatus.PENDING,
        category: dbItem.category,
      });
    }

    const newOrder = await this.orderModel.create({
      ...(userId ? { userId: new Types.ObjectId(userId) } : {}),
      guestId,
      restaurantId,
      tableId,
      items: snapshotItems,
      totalAmount,
      status: OrderStatus.PENDING,
    });


    const order = await this.orderModel
      .findById(newOrder._id)
      .populate('tableId', 'name')
      .select('-createdAt -updatedAt -priorityScore')
      .exec();

    this.sseService.emit({
      type: SseEventType.ORDER_CREATED,
      restaurantId: order?.restaurantId.toString(),
      tableId: order?.tableId.toString(),
      payload: order,
      userId: order?.userId?.toString(),
    });

    return {
      message: 'Đặt hàng thành công',
      orderId: order?._id,
    };
  }

  async updateOrderItemStatus(updateItemDto: UpdateOrderItemStatusDto) {
    const { orderId, itemId, status } = updateItemDto;

    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const item = order.items.find((i) => i.menuItemId.toString() === itemId);
    if (!item) {
      throw new NotFoundException('Item not found in order');
    }

    this.validateStatusTransition(item.status, status);

    item.status = status;

    order.markModified('items');

    order.status = this.calculateOrderStatus(order.items);

    await order.save();

    const populatedOrder = await this.orderModel
      .findById(order._id)
      .populate('tableId', 'name')
      .populate('restaurantId', 'name')
      .exec();

    this.sseService.emit({
      type: SseEventType.ORDER_UPDATED,
      restaurantId: populatedOrder?.restaurantId._id.toString(),
      userId: populatedOrder?.userId?.toString(),
      payload: populatedOrder,
    });

    return populatedOrder;
  }

  async findAll(
    restaurantId: string,
    pagination: PaginationDto = {},
    category?: MenuCategory,
  ): Promise<PaginatedResult<Order>> {
    this.logger.debug(`findAll — restaurantId: ${restaurantId}, category: ${category}`);
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;

    const filter = {
      restaurantId: new Types.ObjectId(restaurantId),
      status: { $nin: ['COMPLETED', 'CANCELED'] },
    };

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'tableId', model: Table.name, select: 'name' })
        .select('-createdAt -updatedAt -priorityScore')
        .lean()
        .exec(),
      this.orderModel.countDocuments(filter),
    ]);

    return buildPaginatedResult(orders as Order[], total, page, limit);
  }

  async findAllForClient(
    userId: string | null,
    guestId: string,
    status: string[],
    pagination: PaginationDto = {},
  ): Promise<PaginatedResult<Order>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;

    const userFilter = userId
      ? { $or: [{ userId: new Types.ObjectId(userId) }, { guestId }] }
      : { guestId };

    const filter = { ...userFilter, status: { $in: status } };

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'tableId', model: Table.name, select: 'name' })
        .populate('restaurantId', 'name')
        .select('-createdAt -updatedAt -priorityScore')
        .exec(),
      this.orderModel.countDocuments(filter),
    ]);

    return buildPaginatedResult(orders as Order[], total, page, limit);
  }

  @OnEvent('invoice.paid')
  async handleInvoicePaid(event: InvoicePaidEvent): Promise<void> {
    const invoice = event.invoice;
    this.logger.debug(`[invoice.paid] Creating order from invoice ${invoice._id} — ${invoice.items?.length ?? 0} item(s)`);

    const orderItems: OrderItemSnapshot[] = invoice.items.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      selectedOptions: item.selectedOptions || [],
      note: item.note,
      imageUrl: item.imageUrl,
      status: OrderStatus.PENDING,
      category: item.category,
    }));

    const newOrder = new this.orderModel({
      ...(invoice.userId ? { userId: invoice.userId } : {}),
      ...(invoice.guestId ? { guestId: invoice.guestId } : {}),
      restaurantId: invoice.restaurantId,
      tableId: invoice.tableId,
      items: orderItems,
      totalAmount: invoice.totalAmount,
      status: OrderStatus.PENDING,
    });

    const savedOrder = await newOrder.save();

    const populatedOrder = await this.orderModel
      .findById(savedOrder._id)
      .populate('tableId', 'name')
      .populate('restaurantId', 'name')
      .exec();

    this.sseService.emit({
      type: SseEventType.ORDER_CREATED,
      restaurantId: populatedOrder?.restaurantId._id.toString(),
      tableId: populatedOrder?.tableId._id.toString(),
      payload: populatedOrder,
      userId: populatedOrder?.userId?.toString(),
    });

    this.logger.debug(`[invoice.paid] Order ${savedOrder._id} created successfully`);
  }

  async findOne(id: string) {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus) {
    if (currentStatus === newStatus) {
      return;
    }

    const statusHierarchy = {
      [OrderStatus.PENDING]: 1,
      [OrderStatus.COOKING]: 2,
      [OrderStatus.COMPLETED]: 3,
      [OrderStatus.CANCELLED]: 0, // Special case
    };

    if (newStatus === OrderStatus.CANCELLED) {
      if (currentStatus !== OrderStatus.PENDING) {
        throw new BadRequestException(
          `Không thể hủy món ăn ở trạng thái ${currentStatus}. Chỉ có thể hủy món ở trạng thái PENDING.`
        );
      }
      return;
    }

    if (currentStatus === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Không thể thay đổi trạng thái của món đã bị hủy.'
      );
    }

    // Cannot change from COMPLETED to anything else
    if (currentStatus === OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'Không thể thay đổi trạng thái của món đã hoàn thành.'
      );
    }

    // Only allow forward progression
    if (statusHierarchy[newStatus] <= statusHierarchy[currentStatus]) {
      throw new BadRequestException(
        `Không thể cập nhật trạng thái lùi từ ${currentStatus} về ${newStatus}. Chỉ được phép cập nhật tiến.`
      );
    }
  }

  calculateOrderStatus(items: OrderItemSnapshot[]): OrderStatus {
    if (items.every((i) => i.status === OrderStatus.COMPLETED || i.status === OrderStatus.CANCELLED) &&
      items.some((i) => i.status === OrderStatus.COMPLETED)) {
      return OrderStatus.COMPLETED;
    }
    if (items.every((i) => i.status === OrderStatus.CANCELLED)) {
      return OrderStatus.CANCELLED;
    }

    if (items.some((i) => i.status === OrderStatus.COOKING)) {
      return OrderStatus.COOKING;
    }

    return OrderStatus.PENDING;
  }
}

