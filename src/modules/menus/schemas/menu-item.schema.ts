import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Restaurant } from '../../restaurants/schemas/restaurant.schema';

export type MenuItemDocument = MenuItem & Document;

class MenuItemOption {
  @Prop() name: string; // VD: Size, Topping
  @Prop() price: number;
}

class MenuItemConfig {
  @Prop()
  name: string;
  @Prop()
  is_required: boolean;
  @Prop({ type: [MenuItemOption] })
  options: MenuItemOption[];
}

@Schema({ timestamps: true })
export class MenuItem {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop()
  image_url: string;

  @Prop({ type: Types.ObjectId, ref: Restaurant.name, required: true })
  restaurant_id: Types.ObjectId;

  @Prop({ default: true })
  is_available: boolean;

  @Prop({ type: [MenuItemConfig], default: [] })
  options: MenuItemConfig[];
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);
