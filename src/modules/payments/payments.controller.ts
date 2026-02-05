import { Controller, Post, Body, Get, Query, Req, Res, Ip } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
    constructor(
        private readonly paymentsService: PaymentsService,
        private readonly configService: ConfigService
    ) { }

    @Post()
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Process payment (Create Sepay/VNPAY payment request)' })
    @ApiResponse({ status: 201, description: 'Payment request created' })
    @ApiResponse({ status: 400, description: 'Invalid payment data' })
    create(@Body() createPaymentDto: CreatePaymentDto, @Ip() ip) {
        return this.paymentsService.processPayment(createPaymentDto, ip);
    }
    @Public()
    @Get('vnpay_return')
    @ApiOperation({ summary: 'VNPAY Return URL' })
    @ApiResponse({ status: 200, description: 'Payment successful' })
    @ApiResponse({ status: 400, description: 'Invalid payment data' })
    async vnpayReturn(@Query() query: any, @Res() res: Response) {
        try {
            const result: any = await this.paymentsService.verifyReturnUrl(query);

            const frontendUrl = this.configService.get<string>('FRONTEND_URL');
            const invoiceId = query.vnp_TxnRef;

            if (result && (result.success || result._id)) {
                return res.redirect(`${frontendUrl}/orders?status=success&invoiceId=${result._id || invoiceId}`);
            } else {
                return res.redirect(`${frontendUrl}/invoice/${invoiceId}?status=failed`);
            }
        } catch (error) {
            console.error('Error in vnpayReturn:', error);
            const frontendUrl = this.configService.get<string>('FRONTEND_URL');
            const invoiceId = query.vnp_TxnRef;
            // Error: redirect back to invoice page with error message
            return res.redirect(`${frontendUrl}/invoice/${invoiceId}?status=error&message=${encodeURIComponent(error.message || 'Unknown error')}`);
        }
    }

    @Public()
    @Get('vnpay_ipn')
    @ApiOperation({ summary: 'VNPAY IPN URL' })
    @ApiResponse({ status: 200, description: 'Payment successful' })
    @ApiResponse({ status: 400, description: 'Invalid payment data' })
    async vnpayIpn(@Query() query: any) {
        return this.paymentsService.vnpayIpn(query);
    }
}
