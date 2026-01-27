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

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    private readonly sseService: SseService,
  ) { }

  async create(createOrderDto: CreateOrderDto, userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { restaurantId, tableId, items } = createOrderDto;

    const table = await this.tableModel.findOne({
      _id: tableId,
    });
    if (!table || !table.isActive)
      throw new BadRequestException('Bàn không hợp lệ hoặc Token sai!');

    let totalAmount = 0;
    const snapshotItems: any[] = [];

    for (const itemDto of items) {
      const dbItem = await this.menuItemModel.findById(itemDto.menuItemId);
      if (!dbItem) continue;

      let itemTotalPrice = dbItem.price;
      if (itemDto.selectedOptions) {
        itemTotalPrice += itemDto.selectedOptions.reduce(
          (sum, opt) => sum + opt.price,
          0,
        );
      }
      const lineTotal = itemTotalPrice * itemDto.quantity;
      totalAmount += lineTotal;

      snapshotItems.push({
        menuItemId: dbItem._id,
        name: dbItem.name,
        price: dbItem.price,
        quantity: itemDto.quantity,
        selectedOptions: itemDto.selectedOptions,
        note: itemDto.note,
        status: OrderStatus.PENDING,
      });
    }

    const newOrder = await this.orderModel.create({
      userId: userId,
      restaurantId,
      tableId,
      items: snapshotItems,
      totalAmount: totalAmount,
      status: OrderStatus.PENDING,
    });

    const order = await this.orderModel
      .findById(newOrder._id)
      .sort({ createdAt: -1 })
      .populate({
        path: 'tableId',
        model: Table.name,
        select: 'name',
      })
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

    const updated = await this.orderModel.findOneAndUpdate(
      {
        _id: orderId,
        'items.menuItemId': new Types.ObjectId(itemId),
      },
      {
        $set: { 'items.$.status': status },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Order or item not found');
    }

    updated.status = this.calculateOrderStatus(updated.items);
    await updated.save();

    const order = await this.orderModel
      .findById(updated._id)
      .populate('tableId', 'name')
      .populate('restaurantId', 'name')
      .exec();

    this.sseService.emit({
      type: SseEventType.ORDER_UPDATED,
      restaurantId: order?.restaurantId._id.toString(),
      userId: order?.userId.toString(),
      payload: order,
    });

    return order;
  }

  async findAll(restaurantId: string) {
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
      .exec();

    return orders;
  }

  async findAllForClient(userId: string, status: string[]) {
    console.log(userId, status);
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
    console.log(orders);
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

