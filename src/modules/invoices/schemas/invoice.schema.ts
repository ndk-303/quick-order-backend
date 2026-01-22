import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Restaurant } from '../../restaurants/schemas/restaurant.schema';
import { Table } from '../../tables/schemas/table.schema';
import { User } from '../../users/schemas/user.schema';

export type InvoiceDocument = Invoice & Document;

export enum InvoiceStatus {
    PENDING = 'PENDING',
    PAID = 'PAID',
    CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
    CASH = 'CASH',
    BANK_TRANSFER = 'BANK_TRANSFER',
    CREDIT_CARD = 'CREDIT_CARD',
    MOMO = 'MOMO',
}

export class InvoiceItemSnapshot {
    @Prop({ type: Types.ObjectId, required: true })
    menu_item_id: Types.ObjectId;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    price: number;

    @Prop({ required: true })
    quantity: number;

    @Prop()
    note: string;
}

@Schema({ timestamps: true })
export class Invoice {
    @Prop({ type: Types.ObjectId, ref: User.name, required: true })
    user_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: Restaurant.name, required: true })
    restaurant_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: Table.name, required: true })
    table_id: Types.ObjectId;

    @Prop({ type: [InvoiceItemSnapshot], required: true })
    items: InvoiceItemSnapshot[];

    @Prop({ required: true })
    total_amount: number;

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
    payment_method?: PaymentMethod;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
