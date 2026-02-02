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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiParam } from '@nestjs/swagger';

@ApiTags('Menus')
@Controller('menus')
export class MenusController {
  constructor(
    private readonly menusService: MenusService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Post()
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create menu item (Restaurant owner)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Menu item created' })
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
        req.user.restaurantId,
        createMenuItemDto,
        imageUrl,
      );
    } else {
      throw new BadRequestException('File ảnh không hợp lệ');
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get menu item by ID' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Menu item details' })
  findOne(@Param('id') id: string) {
    return this.menusService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Menu item updated' })
  update(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ) {
    return this.menusService.update(id, updateMenuItemDto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Delete menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Menu item deleted' })
  remove(@Param('id') id: string) {
    return this.menusService.remove(id);
  }

  @Public()
  @Get(':restaurantId/:tableId')
  @ApiOperation({ summary: 'Get menu for guest (public endpoint)' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'tableId', description: 'Table ID' })
  @ApiResponse({ status: 200, description: 'Menu for guest' })
  async getMenuForGuest(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
  ) {
    console.log(restaurantId);
    return this.menusService.getMenuForClient(restaurantId, tableId);
  }

  @Get()
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get menu for restaurant admin' })
  @ApiResponse({ status: 200, description: 'Restaurant menu' })
  async getMenuForAdmin(@Req() req: any) {
    return this.menusService.getMenuForAdmin(req.user.restaurantId);
  }
}
