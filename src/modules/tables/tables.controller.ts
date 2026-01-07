import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Req,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import { UpdateTableDto } from './dto/update-table.dto';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  create(@Body() name: string, @Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.tablesService.create(name, req.user.userId);
  }

  @Post(':id/qr')
  generateQr(@Param('id') id: string) {
    return this.tablesService.generateQrCode(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tablesService.findById(id);
  }

  @Get()
  findAll(@Body() name: string, @Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.tablesService.findAllByRestaurant(req.user.userId);
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
