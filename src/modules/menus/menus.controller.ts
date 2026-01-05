import {
  Controller,
  Get,
  Param,
  Delete,
  Patch,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  FileTypeValidator,
} from '@nestjs/common';
import { MenusService } from './menus.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { GeoFencingGuard } from 'src/common/guards/geocoding.guard';
import { TableTokenGuard } from 'src/common/guards/table-token.guard';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('menus')
export class MenusController {
  constructor(
    private readonly menusService: MenusService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createMenuItemDto: CreateMenuItemDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' })],
        fileIsRequired: false,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (file) {
      const imageUrl = await this.cloudinaryService.uploadImage(file);
      const data = {
        ...createMenuItemDto,
        image_url: imageUrl,
      };
      return this.menusService.create(data);
    } else {
      throw new BadRequestException('File ảnh không hợp lệ');
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menusService.findOne(id);
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

  @Get(':restaurantId')
  async getMenuForAdmin(@Param('restaurantId') restaurantId: string) {
    return this.menusService.getMenuForAdmin(restaurantId);
  }

  @UseGuards(GeoFencingGuard, TableTokenGuard)
  @Get(':restaurantId/:tableId')
  async getMenuForGuest(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.menusService.getMenuForClient(restaurantId, tableId);
  }
}
