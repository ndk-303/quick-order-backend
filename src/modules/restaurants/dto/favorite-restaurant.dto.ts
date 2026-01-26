import { IsMongoId, IsNotEmpty } from 'class-validator';

export class AddFavoriteDto {
    @IsNotEmpty({ message: 'Restaurant ID không được để trống' })
    @IsMongoId({ message: 'Restaurant ID không hợp lệ' })
    restaurantId: string;
}
