import { Controller, Post, Body, Get, Query, Req, Res, Ip } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
    constructor(
        private readonly paymentsService: PaymentsService,
        private readonly configService: ConfigService
    ) { }

    @Public()
    @Post()
    create(@Body() createPaymentDto: CreatePaymentDto, @Ip() ip) {
        return this.paymentsService.processPayment(createPaymentDto, ip);
    }
    @Public()
    @Get('vnpay_return')
    async vnpayReturn(@Query() query: any, @Res() res: Response) {
        try {
            const result: any = await this.paymentsService.verifyReturnUrl(query);

            const frontendUrl = this.configService.get<string>('FRONTEND_URL');
            const invoiceId = query.vnp_TxnRef;

            if (result && (result.success || result._id)) {
                return res.redirect(`${frontendUrl}/vnpay-result?status=success&invoiceId=${result._id || invoiceId}`);
            } else {
                return res.redirect(`${frontendUrl}/vnpay-result?status=failed&invoiceId=${invoiceId}`);
            }
        } catch (error) {
            console.error('Error in vnpayReturn:', error);
            const frontendUrl = this.configService.get<string>('FRONTEND_URL');
            const invoiceId = query.vnp_TxnRef;
            return res.redirect(`${frontendUrl}/vnpay-result?status=error&message=${encodeURIComponent(error.message || 'Unknown error')}`);
        }
    }

    @Public()
    @Get('vnpay_ipn')
    async vnpayIpn(@Query() query: any) {
        return this.paymentsService.vnpayIpn(query);
    }
}
