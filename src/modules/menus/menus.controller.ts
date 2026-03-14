import {
  Controller,
  Get,
  Param,
  Delete,
  Patch,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  FileTypeValidator,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MenusService } from './menus.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuFilterDto } from './dto/menu-filter.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from 'src/common/decorators/public.decorator';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { GeoFencingGuard } from 'src/common/guards/geocoding.guard';

@Controller('menu')
export class MenusController {
  constructor(
    private readonly menusService: MenusService,
  ) { }

  @Post()
  async create(
    @Req() req: any,
    @Body() createMenuItemDto: CreateMenuItemDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' })],
        fileIsRequired: false,
      }),
    )
    file: Express.Multer.File,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const restaurantId = (req as any).user?.restaurantId as string;
    if (!restaurantId) {
      throw new BadRequestException('Tài khoản chưa được liên kết với nhà hàng nào');
    }
    return this.menusService.create(restaurantId, createMenuItemDto, file);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ) {
    return this.menusService.update(id, updateMenuItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.menusService.remove(id);
  }

  @Public()
  @Get(':restaurantId/:tableId')
  // @UseGuards(GeoFencingGuard)
  async getMenuForGuest(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
    @Body() body: { lat: number, long: number },
    @Query() filters: MenuFilterDto,
    @Req() req: any,
  ) {
    // Lưu context vào session khi client quét QR
    // Dùng cho các request order/thanh toán sau này
    req.session.tableContext = { restaurantId, tableId };

    return this.menusService.getMenuForClient(restaurantId, tableId, filters);
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120000) // 2 minutes - admin needs fresher data
  async getMenuForAdmin(
    @Req() req: any,
    @Query() filters: MenuFilterDto,
  ) {
    console.log('Console: ', req.user);
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('Tài khoản chưa được liên kết với nhà hàng nào');
    }
    return this.menusService.getMenuForAdmin(restaurantId, filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menusService.findOne(id);
  }
}
