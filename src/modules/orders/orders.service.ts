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

    if (!table.isActive) {
      throw new BadRequestException('Bàn không hoạt động!');
    }

    const menuItemIds = items.map((item) => item.menuItemId);
    const menuItems = await this.menuItemModel.find({
      _id: { $in: menuItemIds },
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

    if (status === OrderStatus.CANCELLED && item.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể hủy món ăn đang ở trạng thái PENDING');
    }

    item.status = status;
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

  async findAll(restaurantId: string, category?: string) {
    const orders = await this.orderModel
      .find({
        restaurantId: new Types.ObjectId(restaurantId),
        status: {
          $nin: ['COMPLETED', 'CANCELED'],
        },
        ...(category && { category }),
      })
      .sort({ createdAt: -1 })
      .populate({
        path: 'tableId',
        model: Table.name,
        select: 'name',
      })
      .select('-createdAt -updatedAt -priorityScore')
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
    const orderItems = invoice.items.map(item => ({
      menuItemId: item.menuItemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      note: item.note,
      status: OrderStatus.PENDING
    }));

    const newOrder = new this.orderModel({
      userId: invoice.userId,
      restaurantId: invoice.restaurantId,
      tableId: invoice.tableId,
      items: orderItems,
      totalAmount: invoice.totalAmount,
      status: OrderStatus.PENDING,
    });

    const savedOrder = await newOrder.save();

    return savedOrder;
  }

  async findOne(id: string) {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  calculateOrderStatus(items: OrderItemSnapshot[]): OrderStatus {
    if (items.some((i) => i.status === OrderStatus.COMPLETED)) {
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

