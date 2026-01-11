import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RestaurantTypeDocument = RestaurantType & Document;

@Schema({ timestamps: true })
export class RestaurantType {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop()
  imageUrl?: string;
}

export const RestaurantTypeSchema =
  SchemaFactory.createForClass(RestaurantType);
