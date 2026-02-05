import {
    IsNotEmpty,
    IsNumber,
    IsString,
    IsOptional,
    Min,
    Max,
    IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
    @ApiProperty({
        description: 'Đánh giá (1-5 sao)',
        example: 5,
        type: Number,
        minimum: 1,
        maximum: 5
    })
    @IsNotEmpty({ message: 'Đánh giá không được để trống' })
    @IsNumber({}, { message: 'Đánh giá phải là số' })
    @Min(1, { message: 'Đánh giá tối thiểu là 1 sao' })
    @Max(5, { message: 'Đánh giá tối đa là 5 sao' })
    rating: number;

    @ApiPropertyOptional({
        description: 'Bình luận về nhà hàng',
        example: 'Đồ ăn ngon, phục vụ tốt!',
        type: String
    })
    @IsOptional()
    @IsString({ message: 'Bình luận phải là chuỗi ký tự' })
    comment?: string;

    @ApiPropertyOptional({
        description: 'Danh sách URL hình ảnh đánh giá',
        example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
        type: [String]
    })
    @IsOptional()
    @IsArray({ message: 'Images phải là mảng' })
    @IsString({ each: true, message: 'Mỗi image phải là URL hợp lệ' })
    images?: string[];
}

export class UpdateReviewDto {
    @ApiPropertyOptional({
        description: 'Đánh giá (1-5 sao)',
        example: 4,
        type: Number,
        minimum: 1,
        maximum: 5
    })
    @IsOptional()
    @IsNumber({}, { message: 'Đánh giá phải là số' })
    @Min(1, { message: 'Đánh giá tối thiểu là 1 sao' })
    @Max(5, { message: 'Đánh giá tối đa là 5 sao' })
    rating?: number;

    @ApiPropertyOptional({
        description: 'Bình luận về nhà hàng',
        example: 'Cập nhật: Món ăn vẫn ngon như cũ',
        type: String
    })
    @IsOptional()
    @IsString({ message: 'Bình luận phải là chuỗi ký tự' })
    comment?: string;

    @ApiPropertyOptional({
        description: 'Danh sách URL hình ảnh đánh giá',
        example: ['https://example.com/updated-image.jpg'],
        type: [String]
    })
    @IsOptional()
    @IsArray({ message: 'Images phải là mảng' })
    @IsString({ each: true, message: 'Mỗi image phải là URL hợp lệ' })
    images?: string[];
}
