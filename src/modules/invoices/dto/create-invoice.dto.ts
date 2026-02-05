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
import { MenuCategory } from 'src/common/enums/menu-category';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class InvoiceItemDto {
    @ApiProperty({
        description: 'ID của món ăn trong menu',
        example: '507f1f77bcf86cd799439011',
        type: String
    })
    @IsMongoId()
    @IsNotEmpty()
    menuItemId: string;

    @ApiProperty({
        description: 'Số lượng',
        example: 2,
        type: Number,
        minimum: 1
    })
    @IsNumber()
    @IsNotEmpty()
    quantity: number;

    @ApiPropertyOptional({
        description: 'Ghi chú cho món ăn',
        example: 'Không hành, ít cay',
        type: String
    })
    @IsString()
    @IsOptional()
    note: string;

    @ApiProperty({
        description: 'Danh mục món ăn',
        enum: MenuCategory,
        example: MenuCategory.FOOD
    })
    @IsString()
    @IsNotEmpty()
    category: MenuCategory;
}

export class CreateInvoiceDto {
    @ApiProperty({
        description: 'ID của người dùng (tự động lấy từ JWT token)',
        example: '507f1f77bcf86cd799439011',
        type: String
    })
    @IsMongoId()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({
        description: 'ID của nhà hàng',
        example: '507f1f77bcf86cd799439012',
        type: String
    })
    @IsMongoId()
    @IsNotEmpty()
    restaurantId: string;

    @ApiProperty({
        description: 'ID của bàn',
        example: '507f1f77bcf86cd799439013',
        type: String
    })
    @IsMongoId()
    @IsNotEmpty()
    tableId: string;

    @ApiProperty({
        description: 'Danh sách món đặt',
        type: [InvoiceItemDto],
        minItems: 1
    })
    @IsArray()
    @ValidateNested({ each: true })
    @ArrayMinSize(1)
    @Type(() => InvoiceItemDto)
    items: InvoiceItemDto[];
}

