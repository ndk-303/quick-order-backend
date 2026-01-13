import { Injectable, NotFoundException } from '@nestjs/common';
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
  ) {}

  async create(createTableDto: CreateTableDto, restaurantId: string) {
    const token = uuidv4();

    const { name, capacity } = createTableDto;
    console.log(createTableDto);

    const table = await this.tableModel.create({
      name: name,
      capacity: capacity,
      restaurant: restaurantId,
      token,
    });

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const qrUrl = `/menus/${table.restaurant}/${table._id}?token=${table.token}`;
    const qrImage = await QRCode.toDataURL(qrUrl);
    await this.tableModel.findByIdAndUpdate(table._id, { qrImage: qrImage });
    return {
      tableId: table._id,
      qrImage: qrImage,
    };
  }

  async generateQrCode(tableId: string) {
    const table = await this.tableModel.findById(tableId);

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const qrUrl = `$/menus/${table.restaurant}/${table._id}?token=${table.token}`;

    const qrImage = await QRCode.toDataURL(qrUrl);

    return {
      tableId: table._id,
      qr_image: qrImage,
    };
  }

  async findAllByRestaurant(restaurantId: string) {
    // const restaurant = await this.restaurantModel.findOne({ ownerId: userId });
    // if (!restaurant) {
    //   throw new BadRequestException('Nhà hàng không tồn tại');
    // }

    return await this.tableModel
      .find({ restaurant: restaurantId })
      .select('-restaurant -token');
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
    console.log(updateTableDto);
    const table = await this.tableModel.findByIdAndUpdate(_id, updateTableDto);
    console.log(table);
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
