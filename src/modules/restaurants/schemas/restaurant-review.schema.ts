import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RestaurantReviewDocument = RestaurantReview & Document;

@Schema({ timestamps: true })
export class RestaurantReview {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true })
    restaurantId: Types.ObjectId;

    @Prop({ required: true, min: 1, max: 5 })
    rating: number;

    @Prop({ default: '' })
    comment: string;

    @Prop({ type: [String], default: [] })
    images: string[];
}

export const RestaurantReviewSchema =
    SchemaFactory.createForClass(RestaurantReview);

// Index for efficient queries
RestaurantReviewSchema.index({ restaurantId: 1, createdAt: -1 });
RestaurantReviewSchema.index({ userId: 1 });
