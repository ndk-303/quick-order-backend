import {
    IsNotEmpty,
    IsNumber,
    IsString,
    IsOptional,
    Min,
    Max,
    IsArray,
} from 'class-validator';

export class CreateReviewDto {
    @IsNotEmpty({ message: 'Đánh giá không được để trống' })
    @IsNumber({}, { message: 'Đánh giá phải là số' })
    @Min(1, { message: 'Đánh giá tối thiểu là 1 sao' })
    @Max(5, { message: 'Đánh giá tối đa là 5 sao' })
    rating: number;

    @IsOptional()
    @IsString({ message: 'Bình luận phải là chuỗi ký tự' })
    comment?: string;

    @IsOptional()
    @IsArray({ message: 'Images phải là mảng' })
    @IsString({ each: true, message: 'Mỗi image phải là URL hợp lệ' })
    images?: string[];
}

export class UpdateReviewDto {
    @IsOptional()
    @IsNumber({}, { message: 'Đánh giá phải là số' })
    @Min(1, { message: 'Đánh giá tối thiểu là 1 sao' })
    @Max(5, { message: 'Đánh giá tối đa là 5 sao' })
    rating?: number;

    @IsOptional()
    @IsString({ message: 'Bình luận phải là chuỗi ký tự' })
    comment?: string;

    @IsOptional()
    @IsArray({ message: 'Images phải là mảng' })
    @IsString({ each: true, message: 'Mỗi image phải là URL hợp lệ' })
    images?: string[];
}
