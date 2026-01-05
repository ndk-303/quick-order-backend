import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Restaurant } from '../../restaurants/schemas/restaurant.schema';

export type TableDocument = Table & Document;

@Schema({ timestamps: true })
export class Table {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: Restaurant.name, required: true })
  restaurant_id: Types.ObjectId;

  @Prop({ type: String, required: true })
  token: string;

  @Prop({ default: true })
  is_active: boolean;
}

export const TableSchema = SchemaFactory.createForClass(Table);

// Index ghép để đảm bảo trong 1 quán không có 2 bàn trùng tên
TableSchema.index({ restaurant_id: 1, name: 1 }, { unique: true });
