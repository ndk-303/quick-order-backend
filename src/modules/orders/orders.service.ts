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
    const { restaurant_id, table_id, items } = createOrderDto;

    const table = await this.tableModel.findOne({
      _id: table_id,
    });
    if (!table || !table.is_active)
      throw new BadRequestException('Bàn không hợp lệ hoặc Token sai!');

    let totalAmount = 0;
    const snapshotItems: any[] = [];

    for (const itemDto of items) {
      const dbItem = await this.menuItemModel.findById(itemDto.menu_item_id);
      if (!dbItem) continue;

      let itemTotalPrice = dbItem.price;
      if (itemDto.selected_options) {
        itemTotalPrice += itemDto.selected_options.reduce(
          (sum, opt) => sum + opt.price,
          0,
        );
      }
      const lineTotal = itemTotalPrice * itemDto.quantity;
      totalAmount += lineTotal;

      snapshotItems.push({
        menu_item_id: dbItem._id,
        name: dbItem.name,
        price: dbItem.price,
        quantity: itemDto.quantity,
        selected_options: itemDto.selected_options,
        note: itemDto.note,
        status: OrderStatus.PENDING,
      });
    }

    const newOrder = await this.orderModel.create({
      user_id: userId,
      restaurant_id,
      table_id,
      items: snapshotItems,
      total_amount: totalAmount,
      status: OrderStatus.PENDING,
    });

    const order = await this.orderModel
      .findById(newOrder._id)
      .sort({ createdAt: -1 })
      .populate({
        path: 'table_id',
        model: Table.name,
        select: 'name',
      })
      .select('-createdAt -updatedAt -priority_score')
      .exec();

    this.sseService.emit({
      type: SseEventType.ORDER_CREATED,
      restaurantId: order?.restaurant_id.toString(),
      tableId: order?.table_id.toString(),
      payload: order,
      userId: order?.user_id.toString(),
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
        'items.menu_item_id': new Types.ObjectId(itemId),
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
      .populate('table_id', 'name')
      .populate('restaurant_id', 'name')
      .exec();

    this.sseService.emit({
      type: SseEventType.ORDER_UPDATED,
      restaurantId: order?.restaurant_id._id.toString(),
      userId: order?.user_id.toString(),
      payload: order,
    });

    return order;
  }

  async findAll(restaurantId: string) {
    const orders = await this.orderModel
      .find({
        restaurant_id: restaurantId,
        status: {
          $nin: ['COMPLETED', 'CANCELED'],
        },
      })
      .sort({ createdAt: -1 })
      .populate({
        path: 'table_id',
        model: Table.name,
        select: 'name',
      })
      .select('-createdAt -updatedAt -priority_score')
      .exec();

    return orders;
  }

  async findAllForClient(userId: string, status: string[]) {
    const orders = await this.orderModel
      .find({ user_id: userId, status: { $in: status } })
      .sort({ createdAt: -1 })
      .populate({
        path: 'table_id',
        model: Table.name,
        select: 'name',
      })
      .populate('restaurant_id', 'name')
      .select('-createdAt -updatedAt -priority_score')
      .exec();

    return orders;
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
