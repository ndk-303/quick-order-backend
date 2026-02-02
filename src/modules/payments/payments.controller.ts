import { Controller, Post, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post()
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Process payment (Create Sepay payment request)' })
    @ApiResponse({ status: 201, description: 'Payment request created' })
    @ApiResponse({ status: 400, description: 'Invalid payment data' })
    create(@Body() createPaymentDto: CreatePaymentDto) {
        console.log('Payment:', createPaymentDto);
        return this.paymentsService.processPayment(createPaymentDto);
    }
}
