import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Restaurant } from '../../restaurants/schemas/restaurant.schema';
import { MenuCategory } from 'src/common/enums/menu-category';

export type MenuItemDocument = MenuItem & Document;

class MenuItemOption {
  @Prop() name: string; // VD: Size, Topping
  @Prop() price: number;
}

class MenuItemConfig {
  @Prop()
  name: string;
  @Prop()
  isRequired: boolean;
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
  imageUrl: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Restaurant.name,
    required: true,
  })
  restaurant: mongoose.Types.ObjectId;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ type: [MenuItemConfig], default: [] })
  options: MenuItemConfig[];

  @Prop({ enum: MenuCategory, required: false })
  category: MenuCategory;
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

