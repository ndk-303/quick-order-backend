import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsNumber, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { MenuCategory } from 'src/common/enums/menu-category';

export class MenuFilterDto {
    @ApiPropertyOptional({
        enum: MenuCategory,
        description: 'Filter by menu category (food, drink, desert)'
    })
    @IsOptional()
    @IsEnum(MenuCategory)
    category?: MenuCategory;

    @ApiPropertyOptional({
        description: 'Minimum price filter',
        type: Number
    })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    minPrice?: number;

    @ApiPropertyOptional({
        description: 'Maximum price filter',
        type: Number
    })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    maxPrice?: number;

    @ApiPropertyOptional({
        description: 'Search by menu item name (case-insensitive)',
        type: String
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description: 'Filter by availability status (admin only - ignored for client)',
        type: Boolean
    })
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    isAvailable?: boolean;
}
