import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, IsBoolean } from 'class-validator';

export class CreateTableDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber({}, { message: 'Số lượng khách phải là số' })
  @Min(1, { message: 'Số lượng khách phải lớn hơn 0' })
  capacity: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  qrImage?: string;
}
