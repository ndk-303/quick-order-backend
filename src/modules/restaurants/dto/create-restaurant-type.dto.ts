import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRestaurantTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
