import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class CreateTableDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsMongoId()
  restaurant_id: string;
}
