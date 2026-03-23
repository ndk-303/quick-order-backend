import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateTableDto {
  @IsString({ message: 'Tên bàn phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên bàn không được để trống' })
  @MaxLength(50, { message: 'Tên bàn không được vượt quá 50 ký tự' })
  name: string;

  @IsNotEmpty({ message: 'Số lượng khách không được để trống' })
  @IsNumber({}, { message: 'Số lượng khách phải là số' })
  @Min(1, { message: 'Số lượng khách phải ít nhất là 1' })
  @Type(() => Number)
  capacity: number;

  @IsOptional()
  @IsString({ message: 'Vị trí phải là chuỗi' })
  @MaxLength(100, { message: 'Vị trí không được vượt quá 100 ký tự' })
  location?: string;

  @IsOptional()
  @IsString({ message: 'QR Image phải là chuỗi URL' })
  qrImage?: string;
}
