import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';
import { PaymentMethod } from '../../invoices/schemas/invoice.schema';

export class CreatePaymentDto {
    @IsMongoId()
    @IsNotEmpty()
    invoice_id: string;

    @IsEnum(PaymentMethod)
    @IsNotEmpty()
    method: PaymentMethod;
}
