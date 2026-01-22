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
    menu_item_id: string;

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
    user_id: string;

    @IsMongoId()
    @IsNotEmpty()
    restaurant_id: string;

    @IsMongoId()
    @IsNotEmpty()
    table_id: string;

    @IsArray()
    @ValidateNested({ each: true })
    @ArrayMinSize(1)
    @Type(() => InvoiceItemDto)
    items: InvoiceItemDto[];
}
