import { IsEnum, IsOptional, IsNumberString } from 'class-validator';
import { MenuCategory } from 'src/common/enums/menu-category';

export enum SortBy {
  PRICE = 'price',
  CREATED_AT = 'createdAt',
}

export class GetMenuItemsQueryDto {
  @IsOptional()
  @IsEnum(MenuCategory)
  category?: MenuCategory;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;

  @IsOptional()
  order?: 'asc' | 'desc';
}
