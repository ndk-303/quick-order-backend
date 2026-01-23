import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MenuItem, MenuItemDocument } from './schemas/menu-item.schema';
import {
  Table,
  TableDocument,
} from '../../modules/tables/schemas/table.schema';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import {
  Restaurant,
  RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';

@Injectable()
export class MenusService {
  constructor(
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
  ) { }

  async create(
    restaurantId,
    createMenuItemDto: CreateMenuItemDto,
    imageUrl: string,
  ) {
    const restaurantExists = await this.restaurantModel.findById(restaurantId);

    if (!restaurantExists) {
      throw new NotFoundException(
        'Nhà hàng không tồn tại, không thể thêm món ăn.',
      );
    }

    const data = {
      ...createMenuItemDto,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      restaurant: restaurantId,
      image_url: imageUrl,
    };

    const newItem = new this.menuItemModel(data);
    newItem.save();
    return { message: 'ok' };
  }

  async findOne(id: string): Promise<MenuItem> {
    const item = await this.menuItemModel.findById(id).exec();
    if (!item)
      throw new NotFoundException(`Không tìm thấy món ăn với ID ${id}`);
    return item;
  }

  async update(
    id: string,
    updateMenuItemDto: UpdateMenuItemDto,
  ): Promise<MenuItem> {
    const updatedItem = await this.menuItemModel
      .findByIdAndUpdate(id, updateMenuItemDto, { new: true }) // { new: true } trả về data mới sau khi update
      .exec();

    if (!updatedItem)
      throw new NotFoundException(`Không tìm thấy món ăn để cập nhật`);
    return updatedItem;
  }

  async remove(id: string): Promise<void> {
    const result = await this.menuItemModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Không tìm thấy món ăn để xóa`);
  }

  async getMenuForClient(restaurantId: string, tableId: string) {
    console.log(tableId);
    console.log(restaurantId);

    const table = await this.tableModel
      .findOne({
        _id: tableId,
        restaurant: restaurantId,
      })
      .select('_id name restaurant is_active')
      .populate('restaurant', '_id name')
      .exec();
    console.log(table);

    if (!table) {
      throw new BadRequestException('Mã QR không hợp lệ hoặc đã hết hạn!');
    }

    if (!table.is_active) {
      throw new BadRequestException('Bàn này đang tạm khóa!');
    }

    const menu = await this.menuItemModel
      .find({
        restaurant: restaurantId,
        is_available: true,
      })
      .select('-createdAt -updatedAt -restaurant')
      .exec();

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      table: table,
      menu: menu,
    };
  }

  async getMenuForAdmin(restaurantId: string) {
    const items = await this.menuItemModel
      .find({
        restaurant: new Types.ObjectId(restaurantId),
      })
      .select('-createdAt -updatedAt -restaurant')
      .exec();
    return {
      message: 'Lấy menu thành công',
      menu: items,
    };
  }
}
