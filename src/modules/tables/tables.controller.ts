import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Req,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import { UpdateTableDto } from './dto/update-table.dto';
import { CreateTableDto } from './dto/create-table.dto';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) { }

  @Post()
  create(@Body() createTableDto: CreateTableDto, @Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.tablesService.create(createTableDto, req.user.restaurantId);
  }

  @Post(':id/qr')
  generateQr(@Param('id') id: string) {
    console.log('Generate QR for table: ', id);
    const qrcode = this.tablesService.generateQrCode(id);
    console.log('QR Code: ', qrcode);
    return qrcode;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tablesService.findById(id);
  }

  @Get()
  findAll(@Req() req: any) {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('Tài khoản chưa được liên kết với nhà hàng nào');
    }
    return this.tablesService.findAllByRestaurant(restaurantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.tablesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tablesService.remove(id);
  }
}
