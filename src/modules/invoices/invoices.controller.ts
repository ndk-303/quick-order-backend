import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Controller('invoices')
export class InvoicesController {
    constructor(private readonly invoicesService: InvoicesService) { }

    @Post()
    create(@Body() createInvoiceDto: CreateInvoiceDto, @Req() req: any) {
        // Determine user_id from req structure (assuming similar to Orders)
        // If not passed in body, inject from req.user
        const userId = req.user?.userId;
        if (userId) {
            createInvoiceDto.user_id = userId;
        }
        return this.invoicesService.create(createInvoiceDto);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.invoicesService.findOne(id);
    }
}
