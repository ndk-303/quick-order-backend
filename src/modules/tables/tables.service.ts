import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { Table, TableDocument } from './schemas/table.schema';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TablesService {
  constructor(
    @InjectModel(Table.name)
    private readonly tableModel: Model<TableDocument>,
    private readonly configService: ConfigService,
  ) {}

  async create(createTableDto: CreateTableDto) {
    const token = uuidv4();

    const table = await this.tableModel.create({
      ...createTableDto,
      token,
    });

    return table;
  }

  async generateQrCode(tableId: string) {
    const table = await this.tableModel.findById(tableId);

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    const FRONTEND_URL = this.configService.get<string>('FRONTEND_URL');

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const qrUrl = `${FRONTEND_URL}/menu/${table.restaurant_id}/${table._id}?token=${table.token}`;

    const qrImage = await QRCode.toDataURL(qrUrl);

    return {
      tableId: table._id,
      qr_image: qrImage,
    };
  }

  async findAllByRestaurant(restaurantId: string) {
    return this.tableModel.find({ restaurant_id: restaurantId });
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

    return table;
  }

  async remove(_id: string) {
    const table = await this.tableModel.findByIdAndDelete(_id);

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return {
      message: 'Table deleted successfully',
    };
  }
}
