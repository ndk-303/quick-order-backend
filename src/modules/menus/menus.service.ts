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
import { MenuFilterDto } from './dto/menu-filter.dto';
import {
  Restaurant,
  RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';
import { CacheInvalidationService } from 'src/common/services/cache-invalidation.service';

@Injectable()
export class MenusService {
  constructor(
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
    private readonly cacheInvalidationService: CacheInvalidationService,
  ) { }

  private buildMenuQuery(
    restaurantId: string,
    filters: MenuFilterDto,
    isClientQuery: boolean = false,
  ) {
    const query: any = {
      restaurant: new Types.ObjectId(restaurantId),
    };

    if (isClientQuery) {
      query.isAvailable = true;
    } else if (filters.isAvailable !== undefined) {
      query.isAvailable = filters.isAvailable;
    }

    // Category filter
    if (filters.category) {
      query.category = filters.category;
    }

    // Price range filter
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      query.price = {};
      if (filters.minPrice !== undefined) {
        query.price.$gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        query.price.$lte = filters.maxPrice;
      }
    }

    if (filters.search) {
      query.name = { $regex: filters.search, $options: 'i' };
    }

    return query;
  }

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
      imageUrl: imageUrl,
    };

    const newItem = new this.menuItemModel(data);
    try {
      await newItem.save();
    } catch (error) {
      console.log(error);
    }

    // Invalidate menu cache for this restaurant
    await this.cacheInvalidationService.invalidateMenu(restaurantId);
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

    // Invalidate menu cache and specific item cache
    await this.cacheInvalidationService.invalidateMenu(updatedItem.restaurant.toString());
    await this.cacheInvalidationService.invalidateMenuItem(id);

    return updatedItem;
  }

  async remove(id: string): Promise<void> {
    const result = await this.menuItemModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Không tìm thấy món ăn để xóa`);

    // Invalidate menu cache and specific item cache
    await this.cacheInvalidationService.invalidateMenu(result.restaurant.toString());
    await this.cacheInvalidationService.invalidateMenuItem(id);
  }

  async getMenuForClient(
    restaurantId: string,
    tableId: string,
    filters: MenuFilterDto = {},
  ) {
    const restaurant = await this.restaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundException('Nhà hàng không tồn tại!');
    }
    const table = await this.tableModel
      .findOne({
        _id: tableId,
        restaurant: restaurantId,
      })
      .select('_id name restaurant isActive')
      .populate('restaurant', '_id name')
      .exec();

    if (!table) {
      throw new BadRequestException('Bàn không tồn tại!');
    }

    if (!table.isActive) {
      throw new BadRequestException('Bàn không hoạt động!');
    }

    const query = this.buildMenuQuery(restaurantId, filters, true);
    const menu = await this.menuItemModel
      .find(query)
      .select('-createdAt -updatedAt -restaurant')
      .exec();

    if (!menu) {
      throw new BadRequestException('Menu trống!');
    }
    console.log(menu);
    return {
      table: table,
      menu: menu,
    };
  }

  async getMenuForAdmin(restaurantId: string, filters: MenuFilterDto = {}) {
    const query = this.buildMenuQuery(restaurantId, filters, false);
    const items = await this.menuItemModel
      .find(query)
      .select('-createdAt -updatedAt -restaurant')
      .exec();
    if (!items) {
      throw new BadRequestException('Menu trống!');
    }
    return {
      message: 'Lấy menu thành công',
      menu: items,
    };
  }
}

