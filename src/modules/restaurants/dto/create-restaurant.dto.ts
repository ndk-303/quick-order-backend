import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRestaurantDto {
  @ApiProperty({
    description: 'Tên nhà hàng',
    example: 'Cơm Tấm Sườn Nướng Ngon',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Địa chỉ nhà hàng',
    example: '123 Nguyễn Huệ, Quận 1, TP.HCM',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({
    description: 'Tọa độ [longitude, latitude]',
    example: [106.6297, 10.8231],
    type: [Number],
    minItems: 2,
    maxItems: 2,
  })
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
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  coordinates: number[];

  @ApiProperty({
    description: 'Đánh giá trung bình (0-5)',
    example: 4.5,
    type: Number,
    minimum: 0,
    maximum: 5,
  })
  @IsNumber()
  rating: number;

  @ApiProperty({
    description: 'Số lượng đánh giá',
    example: 128,
    type: Number,
  })
  @IsNumber()
  review: number;

  @ApiProperty({
    description: 'Khoảng giá',
    example: '50,000 - 200,000 VNĐ',
    type: String,
  })
  @IsString()
  priceRange: string;

  @ApiProperty({
    description: 'Loại hình nhà hàng (ID từ restaurant types)',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Giờ mở cửa',
    example: '08:00 - 22:00',
    type: String,
  })
  @IsString()
  openTime: string;
}
