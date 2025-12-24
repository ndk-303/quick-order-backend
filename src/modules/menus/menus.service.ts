import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MenuItem, MenuItemDocument } from './schemas/menu-item.schema';
import {
  Table,
  TableDocument,
} from '../../modules/tables/schemas/table.schema';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenusService {
  constructor(
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
  ) {}

  async create(createMenuItemDto: CreateMenuItemDto): Promise<MenuItem> {
    const newItem = new this.menuItemModel(createMenuItemDto);
    return newItem.save();
  }

  async findAllByRestaurant(
    restaurantId: string,
    tableId: string,
    token: string,
  ) {
    const table = await this.tableModel.findOne({
      _id: tableId,
      restaurant_id: restaurantId,
      token: token,
    });

    if (!table) {
      throw new BadRequestException('Mã QR không hợp lệ hoặc sai Token.');
    }

    if (!table.is_active) {
      throw new BadRequestException('Bàn này hiện đang tạm ngưng phục vụ.');
    }
    const menuItems = await this.menuItemModel
      .find({
        restaurant_id: restaurantId,
        is_available: true,
      })
      .exec();

    return {
      table_name: table.name,
      restaurant_id: restaurantId,
      items: menuItems,
    };
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

  // 5. Xóa món ăn (Soft delete hoặc Hard delete tùy nhu cầu)
  async remove(id: string): Promise<void> {
    const result = await this.menuItemModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Không tìm thấy món ăn để xóa`);
  }

  async getMenuForClient(restaurantId: string, tableId: string, token: string) {
    const table = await this.tableModel.findOne({
      _id: tableId,
      restaurant_id: restaurantId,
      token: token,
    });

    if (!table) {
      throw new BadRequestException('Mã QR không hợp lệ hoặc đã hết hạn!');
    }

    if (!table.is_active) {
      throw new BadRequestException('Bàn này đang tạm khóa!');
    }

    const menu = await this.menuItemModel
      .find({
        restaurant_id: restaurantId,
        is_available: true,
      })
      .exec();

    return {
      restaurant_name: 'Tên quán lấy từ service restaurant...',
      table_name: table.name,
      menu: menu,
    };
  }
}
