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

class InvoiceItemDto {
    @IsMongoId()
    @IsNotEmpty()
    menuItemId: string;

    @IsNumber()
    @IsNotEmpty()
    quantity: number;

    @IsString()
    @IsOptional()
    note: string;
}

export class CreateInvoiceDto {
    @IsMongoId()
    @IsNotEmpty()
    userId: string;

    @IsMongoId()
    @IsNotEmpty()
    restaurantId: string;

    @IsMongoId()
    @IsNotEmpty()
    tableId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @ArrayMinSize(1)
    @Type(() => InvoiceItemDto)
    items: InvoiceItemDto[];
}

