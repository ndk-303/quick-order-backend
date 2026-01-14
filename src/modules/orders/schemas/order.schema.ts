import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Restaurant } from '../../restaurants/schemas/restaurant.schema';
import { Table } from '../../tables/schemas/table.schema';
import { User } from 'src/modules/users/schemas/user.schema';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  PENDING = 'PENDING',
  COOKING = 'COOKING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELED',
}

export class OrderItemSnapshot {
  @Prop({ type: Types.ObjectId, required: true })
  menu_item_id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;

  @Prop({ type: Array })
  selected_options: { name: string; price: number }[];

  @Prop()
  note: string;

  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Restaurant.name, required: true })
  restaurant_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Table.name, required: true })
  table_id: Types.ObjectId;

  @Prop({ type: [OrderItemSnapshot], required: true })
  items: OrderItemSnapshot[];

  @Prop({ required: true })
  total_amount: number;

  @Prop({ default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ default: 0 })
  priority_score: number;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
