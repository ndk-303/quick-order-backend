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
import {
  Restaurant,
  RestaurantDocument,
} from '../../modules/restaurants/schemas/restaurant.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
  ) {}

  private getDistanceFromLatLonInM(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const R = 6371e3;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number) {
    return deg * (Math.PI / 180);
  }

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
