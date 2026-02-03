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
        const { invoiceId, method } = createPaymentDto;

        const invoice: InvoiceDocument = await this.invoicesService.findOne(invoiceId);

        if (invoice.status === InvoiceStatus.PAID) {
            throw new BadRequestException('Invoice already paid');
        }

        invoice.status = InvoiceStatus.PAID;
        invoice.paymentMethod = method;
        await invoice.save();

        const newOrder = await this.ordersService.createFromInvoice(invoice);

        return {
            success: true,
            message: 'Payment successful',
            orderId: newOrder._id,
            invoiceId: invoice._id
        };
    }
}

