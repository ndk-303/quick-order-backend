import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FavoriteRestaurantDocument = FavoriteRestaurant & Document;

@Schema({ timestamps: true })
export class FavoriteRestaurant {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true })
    restaurantId: Types.ObjectId;
}

export const FavoriteRestaurantSchema =
    SchemaFactory.createForClass(FavoriteRestaurant);

// Create compound unique index to prevent duplicate favorites
FavoriteRestaurantSchema.index({ userId: 1, restaurantId: 1 }, { unique: true });
