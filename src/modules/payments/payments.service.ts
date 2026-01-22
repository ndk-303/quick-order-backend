import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from '../invoices/invoices.service';
import { OrdersService } from '../orders/orders.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceStatus, InvoiceDocument } from '../invoices/schemas/invoice.schema';

@Injectable()
export class PaymentsService {
    constructor(
        private readonly invoicesService: InvoicesService,
        private readonly ordersService: OrdersService,
    ) { }

    async processPayment(createPaymentDto: CreatePaymentDto) {
        const { invoice_id, method } = createPaymentDto;

        // 1. Get Invoice
        const invoice: InvoiceDocument = await this.invoicesService.findOne(invoice_id);

        if (invoice.status === InvoiceStatus.PAID) {
            throw new BadRequestException('Invoice already paid'); // Or return existing order?
        }

        // 2. Mock Payment Gateway logic here (Always success for now)
        // if (fail) throw new BadRequestException('Payment failed');

        // 3. Update Invoice Status
        invoice.status = InvoiceStatus.PAID;
        invoice.payment_method = method;
        await invoice.save();

        // 4. Create Order
        const newOrder = await this.ordersService.createFromInvoice(invoice);

        return {
            success: true,
            message: 'Payment successful',
            orderId: newOrder._id,
            invoiceId: invoice._id
        };
    }
}
