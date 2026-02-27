import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTableDto {
  @ApiProperty({
    description: 'Tên bàn',
    example: 'Bàn 5',
    type: String
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Sức chứa (số người)',
    example: 4,
    type: Number,
    minimum: 1
  })
  @IsNotEmpty()
  @IsNumber()
  capacity: number;

  @ApiPropertyOptional({
    description: 'Vị trí bàn trong nhà hàng',
    example: 'Tầng 1, khu A',
    type: String
  })
  @IsOptional()
  @IsString()
  location?: string;
}
