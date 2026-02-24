import {
    IsNotEmpty,
    IsMongoId,
    IsArray,
    ValidateNested,
    IsNumber,
    IsString,
    IsOptional,
    ArrayMinSize,
    MaxLength,
    Matches,
    IsInt,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MenuCategory } from 'src/common/enums/menu-category';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SelectedOptionDto {
    @ApiProperty({
        description: 'Tên tùy chọn',
        example: 'Size L',
        type: String,
        maxLength: 100,
    })
    @IsString()
    @MaxLength(100, { message: 'Tên tùy chọn không được vượt quá 100 ký tự' })
    @IsNotEmpty({ message: 'Tên tùy chọn không được để trống' })
    name: string;

    @ApiProperty({
        description: 'Giá tùy chọn',
        example: 5000,
        type: Number,
        minimum: 0,
    })
    @IsNumber()
    @Min(0, { message: 'Giá tùy chọn phải lớn hơn hoặc bằng 0' })
    @IsNotEmpty({ message: 'Giá tùy chọn không được để trống' })
    price: number;
}

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
        minimum: 1,
        maximum: 50,
    })
    @IsNumber()
    @IsInt({ message: 'Số lượng phải là số nguyên' })
    @Min(1, { message: 'Số lượng phải lớn hơn hoặc bằng 1' })
    @Max(50, { message: 'Số lượng không được vượt quá 50' })
    @IsNotEmpty({ message: 'Số lượng không được để trống' })
    quantity: number;

    @ApiPropertyOptional({
        description: 'Các tùy chọn đã chọn (topping, size, v.v.)',
        example: [
            { name: 'Size L', price: 5000 },
            { name: 'Extra cheese', price: 10000 }
        ],
        type: [SelectedOptionDto],
    })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => SelectedOptionDto)
    selectedOptions?: SelectedOptionDto[];

    @ApiPropertyOptional({
        description: 'Ghi chú cho món ăn',
        example: 'Không hành, ít cay',
        type: String,
        maxLength: 500
    })
    @IsString()
    @IsOptional()
    @MaxLength(500, { message: 'Ghi chú không được vượt quá 500 ký tự' })
    @Matches(/^[^<>'";\\/]*$/, { message: 'Ghi chú không được chứa ký tự đặc biệt' })
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
    @ApiPropertyOptional({
        description: 'ID của người dùng (tự động lấy từ JWT token, không cần gửi từ client)',
        example: '507f1f77bcf86cd799439011',
        type: String
    })
    @IsMongoId()
    @IsOptional()
    userId?: string;

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

    // @ApiProperty({
    //     description: 'Vĩ độ của vị trí khách hàng',
    //     example: 10.8231,
    //     type: Number,
    // })
    // @IsNumber()
    // @IsNotEmpty({ message: 'Thiếu vĩ độ' })
    // lat: number;

    // @ApiProperty({
    //     description: 'Kinh độ của vị trí khách hàng',
    //     example: 106.6297,
    //     type: Number,
    // })
    // @IsNumber()
    // @IsNotEmpty({ message: 'Thiếu kinh độ' })
    // long: number;
}

