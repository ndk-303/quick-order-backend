import {
  Injectable,
  BadRequestException,
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

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    private readonly sseService: SseService,
  ) { }

  async create(createOrderDto: CreateOrderDto, userId: string) {
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

    const existingOrders = await this.orderModel.find({
      userId: new Types.ObjectId(userId),
      tableId: new Types.ObjectId(tableId)
    });
    console.log(existingOrders);
    // Allow order if table is active OR user already has active orders on this table
    if (!table.isActive && !existingOrders) {
      throw new BadRequestException('Bàn không hoạt động!');
    }

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

      // Validate selected options
      if (itemDto.selectedOptions && itemDto.selectedOptions.length > 0) {
        // Check if menu item supports options
        if (!dbItem.options || dbItem.options.length === 0) {
          throw new BadRequestException(
            `Món ăn "${dbItem.name}" không hỗ trợ tùy chọn`
          );
        }

        // 1. Check for duplicate options
        const optionNames = itemDto.selectedOptions.map(opt => opt.name);
        const uniqueNames = new Set(optionNames);
        if (optionNames.length !== uniqueNames.size) {
          throw new BadRequestException('Không được chọn trùng lặp tùy chọn');
        }

        // 2. Validate each option exists and is active
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

      const optionsPrice = itemDto.selectedOptions?.reduce(
        (sum, opt) => sum + opt.price,
        0
      ) || 0;
      const itemTotalPrice = dbItem.price + optionsPrice;
      const lineTotal = itemTotalPrice * itemDto.quantity;
      totalAmount += lineTotal;

      snapshotItems.push({
        menuItemId: dbItem._id,
        name: dbItem.name,
        price: dbItem.price,
        quantity: itemDto.quantity,
        selectedOptions: itemDto.selectedOptions || [],
        note: itemDto.note,
        status: OrderStatus.PENDING,
        category: dbItem.category,
      });
    }

    const newOrder = await this.orderModel.create({
      userId,
      restaurantId,
      tableId,
      items: snapshotItems,
      totalAmount,
      status: OrderStatus.PENDING,
    });

    if (existingOrders.length === 0) {
      await this.tableModel.findByIdAndUpdate(tableId, { isActive: false });
    }

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
      userId: order?.userId.toString(),
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
      userId: populatedOrder?.userId.toString(),
      payload: populatedOrder,
    });

    return populatedOrder;
  }

  async findAll(restaurantId: string, category?: MenuCategory) {
    console.log('Category', category);
    console.log('equal: ', category === MenuCategory.FOOD);
    const orders = await this.orderModel
      .find({
        restaurantId: new Types.ObjectId(restaurantId),
        status: {
          $nin: ['COMPLETED', 'CANCELED'],
        },
      })
      .sort({ createdAt: -1 })
      .populate({
        path: 'tableId',
        model: Table.name,
        select: 'name',
      })
      .select('-createdAt -updatedAt -priorityScore')
      .lean()
      .exec();

    if (!orders) {
      throw new NotFoundException('Orders not found');
    }

    return orders;
  }

  async findAllForClient(userId: string, status: string[]) {
    const orders = await this.orderModel
      .find({ userId: new Types.ObjectId(userId), status: { $in: status } })
      .sort({ createdAt: -1 })
      .populate({
        path: 'tableId',
        model: Table.name,
        select: 'name',
      })
      .populate('restaurantId', 'name')
      .select('-createdAt -updatedAt -priorityScore')
      .exec();

    if (!orders) {
      throw new NotFoundException('Orders not found');
    }
    return orders;
  }

  async createFromInvoice(invoice: any) {
    console.log('Invoice items', invoice.items);
    const orderItems = invoice.items.map(item => ({
      menuItemId: item.menuItemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      note: item.note,
      status: OrderStatus.PENDING,
      category: item.category,
    }));
    console.log('OrderItems', orderItems);
    const newOrder = new this.orderModel({
      userId: invoice.userId,
      restaurantId: invoice.restaurantId,
      tableId: invoice.tableId,
      items: orderItems,
      totalAmount: invoice.totalAmount,
      status: OrderStatus.PENDING,
    });

    const savedOrder = await newOrder.save();

    // Update table status to inactive (occupied)
    await this.tableModel.findByIdAndUpdate(invoice.tableId, { isActive: false });

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
      userId: populatedOrder?.userId.toString(),
    });

    return savedOrder;
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

