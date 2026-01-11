import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RestaurantType } from './restaurant-types.schema';

export type RestaurantDocument = Restaurant & Document;

@Schema({ timestamps: true })
export class Restaurant {
  @Prop({ required: true })
  name: string;

  @Prop()
  address: string;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  location: {
    type: string;
    coordinates: number[];
  };

  @Prop({ default: 50 })
  allowedRadius: number;

  @Prop()
  rating: number;

  @Prop()
  review: number;

  @Prop()
  priceRange: string;

  @Prop()
  imageUrl: string;

  @Prop({ type: Types.ObjectId, ref: RestaurantType.name })
  type: Types.ObjectId;

  @Prop()
  openTime: string;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

RestaurantSchema.index({ location: '2dsphere' });
