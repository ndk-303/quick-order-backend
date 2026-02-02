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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class OrderItemDto {
  @ApiProperty({
    description: 'ID của món ăn trong menu',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  menuItemId: string;

  @ApiProperty({
    description: 'Số lượng',
    example: 2,
    type: Number,
    minimum: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({
    description: 'Các tùy chọn đã chọn (topping, size, v.v.)',
    example: [
      { name: 'Size L', price: 5000 },
      { name: 'Extra cheese', price: 10000 }
    ],
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        price: { type: 'number' }
      }
    }
  })
  @IsArray()
  @IsOptional()
  selectedOptions: { name: string; price: number }[];

  @ApiPropertyOptional({
    description: 'Ghi chú cho món ăn',
    example: 'Không hành, ít cay',
    type: String,
  })
  @IsString()
  @IsOptional()
  note: string;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'ID của nhà hàng',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  restaurantId: string;

  @ApiProperty({
    description: 'ID của bàn',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  tableId: string;

  @ApiProperty({
    description: 'Danh sách món đặt',
    type: [OrderItemDto],
    minItems: 1,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({
    description: 'Vĩ độ của vị trí khách hàng',
    example: 10.8231,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @ApiProperty({
    description: 'Kinh độ của vị trí khách hàng',
    example: 106.6297,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  long: number;
}
