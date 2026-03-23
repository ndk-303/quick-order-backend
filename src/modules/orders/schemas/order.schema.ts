import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Restaurant } from '../../restaurants/schemas/restaurant.schema';
import { Table } from '../../tables/schemas/table.schema';
import { User } from 'src/modules/users/schemas/user.schema';
import { MenuCategory } from 'src/common/enums/menu-category';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  PENDING = 'PENDING',
  COOKING = 'COOKING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELED',
}

export class OrderItemSnapshot {
  @Prop({ type: Types.ObjectId, required: true })
  menuItemId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;

  @Prop({ type: Array })
  selectedOptions: { name: string; price: number }[];

  @Prop()
  note: string;

  @Prop()
  imageUrl?: string;

  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Prop({ type: String, enum: Object.values(MenuCategory), required: true })
  category: MenuCategory;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: User.name, required: false })
  userId?: Types.ObjectId;

  @Prop({ type: String, required: false })
  guestId?: string;

  @Prop({ type: Types.ObjectId, ref: Restaurant.name, required: true })
  restaurantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Table.name, required: true })
  tableId: Types.ObjectId;

  @Prop({ type: [OrderItemSnapshot], required: true })
  items: OrderItemSnapshot[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ default: 0 })
  priorityScore: number;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

