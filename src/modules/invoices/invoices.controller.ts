import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('invoices')
export class InvoicesController {
    constructor(private readonly invoicesService: InvoicesService) { }

    @Public()
    @Post()
    async create(@Body() createInvoiceDto: CreateInvoiceDto, @Req() req: any) {
        // Client anonymous có thể tạo invoice, gắn userId nếu đã đăng nhập
        const userId = req.session?.user?.userId;
        const guestId = req.sessionID;
        if (userId) {
            createInvoiceDto.userId = userId;
        }
        const invoice = await this.invoicesService.create(createInvoiceDto, guestId);
        return invoice;
    }

    @Public()
    @Get()
    async findUserInvoices(@Req() req: any) {
        const userId = req.session?.user?.userId ?? null;
        const guestId = req.sessionID;
        return this.invoicesService.findByUser(userId, guestId);
    }

    @Get('restaurant')
    async findRestaurantInvoices(@Req() req: any) {
        const restaurantId = req.user?.restaurantId;
        return this.invoicesService.findByRestaurant(restaurantId);
    }

    @Public()
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const invoice = await this.invoicesService.findOne(id);
        return invoice;
    }
}
