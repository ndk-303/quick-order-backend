import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsOptional,
  Min,
  MaxLength,
  IsEnum,
  IsUrl,
} from 'class-validator';

import { Type, Transform } from 'class-transformer';
import { MenuCategory } from '../../../common/enums/menu-category';

class MenuItemOptionDto {

  @IsString({ message: 'Tên tùy chọn phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên tùy chọn không được để trống' })
  @MaxLength(100, { message: 'Tên tùy chọn không được vượt quá 100 ký tự' })
  name: string;

  @IsNumber({}, { message: 'Giá tùy chọn phải là số' })
  @IsNotEmpty({ message: 'Giá tùy chọn không được để trống' })
  @Min(0, { message: 'Giá tùy chọn phải lớn hơn hoặc bằng 0' })
  price: number;
}

class MenuItemConfigDto {
  @IsString({ message: 'Tên nhóm tùy chọn phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên nhóm tùy chọn không được để trống' })
  @MaxLength(100, { message: 'Tên nhóm tùy chọn không được vượt quá 100 ký tự' })
  name: string;

  @IsBoolean({ message: 'Trạng thái bắt buộc phải là kiểu boolean' })
  @IsOptional()
  isRequired: boolean;

  @IsArray({ message: 'Danh sách tùy chọn phải là mảng' })
  @ValidateNested({ each: true })
  @Type(() => MenuItemOptionDto)
  options: MenuItemOptionDto[];
}

export class CreateMenuItemDto {

  @IsString({ message: 'Tên món ăn phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên món ăn không được để trống' })
  @MaxLength(100, { message: 'Tên món ăn không được vượt quá 100 ký tự' })
  name: string;

  @IsString({ message: 'Mô tả phải là chuỗi' })
  @IsOptional()
  @MaxLength(500, { message: 'Mô tả không được vượt quá 500 ký tự' })
  description: string;

  @IsNumber({}, { message: 'Giá món ăn phải là số' })
  @IsNotEmpty({ message: 'Giá món ăn không được để trống' })
  @Min(0, { message: 'Giá món ăn phải lớn hơn hoặc bằng 0' })
  price: number;

  @IsUrl({}, { message: 'Đường dẫn hình ảnh không hợp lệ' })
  @IsOptional()
  imageUrl?: string;

  @IsEnum(MenuCategory, { message: 'Danh mục không hợp lệ' })
  @IsNotEmpty({ message: 'Danh mục không được để trống' })
  category: MenuCategory;

  @IsBoolean({ message: 'Trạng thái hiển thị phải là kiểu boolean' })
  @IsOptional()
  isAvailable?: boolean;

  @IsArray({ message: 'Danh sách nhóm tùy chọn phải là mảng' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        return value;
      }
    }
    return value;
  })
  @ValidateNested({ each: true })
  @Type(() => MenuItemConfigDto)
  options: MenuItemConfigDto[];
}
