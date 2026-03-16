import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Restaurant } from '../../restaurants/schemas/restaurant.schema';
import { Table } from '../../tables/schemas/table.schema';
import { User } from '../../users/schemas/user.schema';
import { MenuCategory } from 'src/common/enums/menu-category';

export type InvoiceDocument = Invoice & Document;

export enum InvoiceStatus {
    PENDING = 'PENDING',
    PAID = 'PAID',
    CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
    BANK = 'BANK',
    MOMO = 'MOMO',
    ZALOPAY = 'ZALOPAY',
    VNPAY = 'VNPAY'
}

export class InvoiceItemSnapshot {
    @Prop({ type: Types.ObjectId, required: true })
    menuItemId: Types.ObjectId;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    price: number;

    @Prop({ required: true })
    quantity: number;

    @Prop({ type: Array, default: [] })
    selectedOptions: { name: string; price: number }[];

    @Prop()
    note: string;

    @Prop({ type: String, enum: Object.values(MenuCategory), required: true })
    category: MenuCategory;
}

@Schema({ timestamps: true })
export class Invoice {
    @Prop({ type: Types.ObjectId, ref: User.name, required: false })
    userId?: Types.ObjectId;

    @Prop({ type: String, required: false })
    guestId?: string;

    @Prop({ type: Types.ObjectId, ref: Restaurant.name, required: true })
    restaurantId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: Table.name, required: true })
    tableId: Types.ObjectId;

    @Prop({ type: [InvoiceItemSnapshot], required: true })
    items: InvoiceItemSnapshot[];

    @Prop({ required: true })
    totalAmount: number;

    @Prop({
        type: String,
        enum: Object.values(InvoiceStatus),
        default: InvoiceStatus.PENDING,
    })
    status: InvoiceStatus;

    @Prop({
        type: String,
        enum: Object.values(PaymentMethod),
        required: false,
    })
    paymentMethod?: PaymentMethod;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

