import { InvoiceDocument } from '../../modules/invoices/schemas/invoice.schema';

/**
 * Event emitted when an invoice is successfully paid.
 * OrdersService listens for this event to create the corresponding Order.
 */
export class InvoicePaidEvent {
    readonly invoice: InvoiceDocument;

    constructor(invoice: InvoiceDocument) {
        this.invoice = invoice;
    }
}
