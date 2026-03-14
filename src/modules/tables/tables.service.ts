import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as QRCode from 'qrcode';
import { Table, TableDocument } from './schemas/table.schema';
import { UpdateTableDto } from './dto/update-table.dto';
import { ConfigService } from '@nestjs/config';
import { CreateTableDto } from './dto/create-table.dto';
const { v4: uuidv4 } = require('uuid');

@Injectable()
export class TablesService {
  constructor(
    @InjectModel(Table.name)
    private readonly tableModel: Model<TableDocument>,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) { }

  private getCacheKey(restaurantId: string): string {
    return `tables:${restaurantId}`;
  }

  async create(createTableDto: CreateTableDto, restaurantId: string) {
    const token = uuidv4();
    console.log(restaurantId);
    const { name, capacity, location } = createTableDto;
    console.log(createTableDto);

    try {
      const table = await this.tableModel.create({
        name: name,
        capacity: capacity,
        restaurant: restaurantId,
        token,
      });

      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      const qrUrl = `${this.configService.get('FRONTEND_URL')}/menus/${table.restaurant}/${table._id}`;
      const qrImage = await QRCode.toDataURL(qrUrl);
      await this.tableModel.findByIdAndUpdate(table._id, { qrImage: qrImage });

      const cacheKey = this.getCacheKey(restaurantId);
      console.log(`[Cache Debug] Create - RestaurantId: ${restaurantId}, Deleting Key: ${cacheKey}`);
      await this.cacheManager.del(cacheKey);

      return {
        tableId: table._id,
        qrImage: qrImage,
      };
    } catch (error) {
      console.log('Failed to create table', error);
      throw new BadRequestException('Failed to create table');
    }
  }

  async generateQrCode(tableId: string) {
    const table = await this.tableModel.findById(tableId);

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const qrUrl = `${this.configService.get('FRONTEND_URL')}/menus/${table.restaurant}/${table._id}?token=${table.token}`;
    const qrImage = await QRCode.toDataURL(qrUrl);
    await this.update(table._id.toString(), { ...table, qrImage: qrImage });
    return {
      tableId: table._id,
      qr_image: qrImage,
    };
  }

  async findAllByRestaurant(restaurantId: string) {
    const cacheKey = this.getCacheKey(restaurantId);
    console.log(`[Cache Debug] FindAll - RestaurantId: ${restaurantId}, Key: ${cacheKey}`);
    const cachedData = await this.cacheManager.get(cacheKey);

    if (cachedData) {
      console.log('[Cache Debug] Returning cached data');
      return cachedData;
    }

    console.log('[Cache Debug] Cache miss, fetching from DB');

    const tables = await this.tableModel
      .find({ restaurant: restaurantId })
      .select('-restaurant -token');

    await this.cacheManager.set(cacheKey, tables, 300000); // 5 minutes

    return tables;
  }

  async findById(id: string) {
    const table = await this.tableModel.findById(id);

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }

  async findByToken(token: string): Promise<boolean> {
    const table = await this.tableModel.findOne({ token });
    return !!table;
  }

  async update(_id: string, updateTableDto: UpdateTableDto) {
    const table = await this.tableModel.findByIdAndUpdate(_id, updateTableDto);
    if (!table) {
      throw new NotFoundException('Table not found');
    }

    await this.cacheManager.del(this.getCacheKey(String(table.restaurant)));

    return table;
  }

  async remove(_id: string) {
    const table = await this.tableModel.findByIdAndDelete(_id);

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    await this.cacheManager.del(this.getCacheKey(String(table.restaurant)));

    return {
      message: 'Table deleted successfully',
    };
  }
}
