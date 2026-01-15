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
} from '@nestjs/common';
import { MenusService } from './menus.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('menus')
export class MenusController {
  constructor(
    private readonly menusService: MenusService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
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
    if (file) {
      const imageUrl = await this.cloudinaryService.uploadMenuImage(file);
      return this.menusService.create(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        req.user.restaurantId,
        createMenuItemDto,
        imageUrl,
      );
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

  @Public()
  @Get(':restaurantId/:tableId')
  async getMenuForGuest(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
  ) {
    console.log(restaurantId);
    return this.menusService.getMenuForClient(restaurantId, tableId);
  }

  @Get()
  async getMenuForAdmin(@Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.menusService.getMenuForAdmin(req.user.restaurantId);
  }
}
