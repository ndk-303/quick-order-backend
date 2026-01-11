import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';

import { Type } from 'class-transformer';

class MenuItemOptionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;
}

class MenuItemConfigDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  @IsOptional()
  is_required: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuItemOptionDto)
  options: MenuItemOptionDto[];
}

export class CreateMenuItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  image_url: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MenuItemConfigDto)
  options: MenuItemConfigDto[];
}
