import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateTableDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  capacity: number;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  is_active: boolean;
}
