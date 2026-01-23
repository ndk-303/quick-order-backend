import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Controller('invoices')
export class InvoicesController {
    constructor(private readonly invoicesService: InvoicesService) { }

    @Post()
    async create(@Body() createInvoiceDto: CreateInvoiceDto, @Req() req: any) {
        // Determine user_id from req structure (assuming similar to Orders)
        // If not passed in body, inject from req.user
        const userId = req.user?.userId;
        if (userId) {
            createInvoiceDto.user_id = userId;
        }
        const invoice = await this.invoicesService.create(createInvoiceDto);
        return invoice;
    }

    @Get()
    async findUserInvoices(@Req() req: any) {
        const userId = req.user.userId;
        return this.invoicesService.findByUser(userId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const invoice = await this.invoicesService.findOne(id);
        return invoice;
    }
}
