import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvoicesService } from '../invoices/invoices.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceStatus, InvoiceDocument, PaymentMethod } from '../invoices/schemas/invoice.schema';
import { ConfigService } from '@nestjs/config';
import { InvoicePaidEvent } from 'src/common/events/invoice-paid.event';
import * as crypto from 'crypto';
import * as qs from 'qs';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        private readonly invoicesService: InvoicesService,
        private readonly eventEmitter: EventEmitter2,
        private readonly configService: ConfigService,
    ) { }

    async processPayment(createPaymentDto: CreatePaymentDto, ipAddr: string = '127.0.0.1') {
        const { invoiceId, method } = createPaymentDto;

        const invoice = await this.invoicesService.findOne(invoiceId);

        if (invoice.status === InvoiceStatus.PAID) {
            throw new BadRequestException('Invoice already paid');
        }

        if (method === PaymentMethod.VNPAY) {
            return {
                url: this.createVnPayUrl(invoice, ipAddr)
            };
        }

        // For other methods (Cash, etc.) - simple instant completion
        invoice.status = InvoiceStatus.PAID;
        invoice.paymentMethod = method;
        await invoice.save();

        this.eventEmitter.emit('invoice.paid', new InvoicePaidEvent(invoice));

        return {
            success: true,
            message: 'Payment successful',
            invoiceId: invoice._id
        };
    }

    createVnPayUrl(invoice: InvoiceDocument, ipAddr: string): string {
        const tmnCode = this.configService.get<string>('VNP_TMN_CODE');
        const secretKey = this.configService.get<string>('VNP_HASH_SECRET');
        const vnpUrl = this.configService.get<string>('VNP_URL');
        const returnUrl = this.configService.get<string>('VNP_RETURN_URL');

        const date = new Date();
        const createDate = this.formatDate(date);
        const orderId = invoice._id.toString();
        // VNPAY expects amount * 100
        const amount = invoice.totalAmount * 100;

        // Basic params
        const vnp_Params: any = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = 'vn';
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = `Thanh toan don hang ${orderId}`;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = amount;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;

        // Sort params
        const sortedParams = this.sortObject(vnp_Params);

        // Sign
        const signData = qs.stringify(sortedParams, { encode: false });
        const hmac = crypto.createHmac('sha512', secretKey!);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        sortedParams['vnp_SecureHash'] = signed;

        return vnpUrl + '?' + qs.stringify(sortedParams, { encode: false });
    }

    async verifyReturnUrl(vnp_Params: any) {
        try {
            const secureHash = vnp_Params['vnp_SecureHash'];

            delete vnp_Params['vnp_SecureHash'];
            delete vnp_Params['vnp_SecureHashType'];

            const sortedParams = this.sortObject(vnp_Params);
            const secretKey = this.configService.get<string>('VNP_HASH_SECRET');

            const signData = qs.stringify(sortedParams, { encode: false });
            const hmac = crypto.createHmac('sha512', secretKey!);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

            if (secureHash === signed) {
                if (vnp_Params['vnp_ResponseCode'] === '00') {
                    const invoiceId = vnp_Params['vnp_TxnRef'];
                    return await this.completePayment(invoiceId, PaymentMethod.VNPAY);
                } else {
                    return { code: '97', message: 'Fail' };
                }
            } else {
                this.logger.warn(`Invalid VNPAY signature — invoiceId: ${vnp_Params['vnp_TxnRef']}`);
                return { code: '97', message: 'Invalid Signature' };
            }
        } catch (error) {
            this.logger.error(`Error in verifyReturnUrl: ${error.message}`, error.stack);
            throw error;
        }
    }

    async vnpayIpn(vnp_Params: any) {
        const secureHash = vnp_Params['vnp_SecureHash'];

        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        const sortedParams = this.sortObject(vnp_Params);
        const secretKey = this.configService.get<string>('VNP_HASH_SECRET');
        const signData = qs.stringify(sortedParams, { encode: false });
        const hmac = crypto.createHmac('sha512', secretKey!);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        if (secureHash === signed) {
            const invoiceId = vnp_Params['vnp_TxnRef'];
            const rspCode = vnp_Params['vnp_ResponseCode'];

            const invoice = await this.invoicesService.findOne(invoiceId);
            if (!invoice) {
                return { RspCode: '01', Message: 'Order not found' };
            }

            // Check amount
            const checkAmount = invoice.totalAmount * 100 === parseInt(vnp_Params['vnp_Amount']);
            if (!checkAmount) {
                return { RspCode: '04', Message: 'Invalid amount' };
            }

            // Check status
            if (invoice.status === InvoiceStatus.PAID) {
                return { RspCode: '02', Message: 'Order already confirmed' };
            }

            if (rspCode === '00') {
                await this.completePayment(invoiceId, PaymentMethod.VNPAY);
                return { RspCode: '00', Message: 'Success' };
            } else {
                // Payment failed logic if needed
                return { RspCode: '00', Message: 'Success' }; // Acknowledge callback even if payment failed
            }
        } else {
            return { RspCode: '97', Message: 'Invalid Checksum' };
        }
    }

    private async completePayment(invoiceId: string, method: PaymentMethod) {
        try {
            const invoice = await this.invoicesService.findOne(invoiceId);

            if (!invoice) {
                this.logger.warn(`completePayment: Invoice ${invoiceId} not found`);
                throw new NotFoundException(`Invoice ${invoiceId} not found`);
            }

            if (invoice.status === InvoiceStatus.PAID) {
                return { _id: invoice._id, status: 'PAID' };
            }

            invoice.status = InvoiceStatus.PAID;
            invoice.paymentMethod = method;
            await invoice.save();

            this.eventEmitter.emit('invoice.paid', new InvoicePaidEvent(invoice));

            return invoice;
        } catch (error) {
            this.logger.error(`Error in completePayment: ${error.message}`, error.stack);
            throw error;
        }
    }

    private sortObject(obj: any) {
        const sorted: any = {};
        const str: string[] = [];
        let key;
        for (key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                str.push(encodeURIComponent(key));
            }
        }
        str.sort();
        for (key = 0; key < str.length; key++) {
            sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
        }
        return sorted;
    }

    private formatDate(date: Date): string {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const HH = String(date.getHours()).padStart(2, '0');
        const MM = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        return `${yyyy}${mm}${dd}${HH}${MM}${ss}`;
    }
}

