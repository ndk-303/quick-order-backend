import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as QRCode from 'qrcode';
import {v4 as uuidv4} from 'uuid';
import { Table, TableDocument } from './schemas/table.schema';
import { CreateTableDto } from './dto/create-table.dto';

@Injectable()
export class TablesService {
  constructor(
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
  ) {}

  async create(createTableDto: CreateTableDto) {
    const token = uuidv4();

    const newTable = await this.tableModel.create({
      ...createTableDto,
      token,
    });

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const qrUrl = `https://your-frontend-domain.com/order/${newTable.restaurant_id}/${newTable._id}?token=${token}`;
    const qrImage = await QRCode.toDataURL(qrUrl);

    return {
      table: newTable,
      qr_image: qrImage,
    };
  }
}
