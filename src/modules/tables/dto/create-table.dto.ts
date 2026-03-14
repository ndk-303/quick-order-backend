import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateTableDto {

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  capacity: number;

  @IsOptional()
  @IsString()
  location?: string;


  @IsOptional()
  @IsString()
  qrImage?: string;
}
