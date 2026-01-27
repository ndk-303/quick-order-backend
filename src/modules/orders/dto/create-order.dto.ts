import {
  IsNotEmpty,
  IsMongoId,
  IsArray,
  ValidateNested,
  IsNumber,
  IsString,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsMongoId()
  @IsNotEmpty()
  menuItemId: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsArray()
  @IsOptional()
  selectedOptions: { name: string; price: number }[];

  @IsString()
  @IsOptional()
  note: string;
}

export class CreateOrderDto {
  @IsMongoId()
  @IsNotEmpty()
  restaurantId: string;

  @IsMongoId()
  @IsNotEmpty()
  tableId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @IsNumber()
  @IsNotEmpty()
  long: number;
}

