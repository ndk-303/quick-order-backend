import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  MenuItem,
  MenuItemDocument,
} from '../../modules/menus/schemas/menu-item.schema';
import {
  Table,
  TableDocument,
} from '../../modules/tables/schemas/table.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { restaurant_id, table_id, table_token, items, lat, long } =
      createOrderDto;

    const table = await this.tableModel.findOne({
      _id: table_id,
      restaurant_id: restaurant_id,
      token: table_token,
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
      });
    }

    const newOrder = new this.orderModel({
      restaurant_id,
      table_id,
      items: snapshotItems,
      total_amount: totalAmount,
      status: OrderStatus.PENDING,
    });

    return newOrder.save();
  }
}
