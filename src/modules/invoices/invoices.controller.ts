import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
    constructor(private readonly invoicesService: InvoicesService) { }

    @Post()
    @ApiBearerAuth('JWT')
    @ApiOperation({
        summary: 'Tạo hóa đơn mới',
        description: 'Tạo hóa đơn cho đơn hàng. Hóa đơn sẽ có status PENDING cho đến khi thanh toán thành công. Sau khi thanh toán, hóa đơn sẽ được chuyển thành Order.'
    })
    @ApiBody({ type: CreateInvoiceDto })
    @ApiResponse({
        status: 201,
        description: 'Tạo hóa đơn thành công',
        schema: {
            type: 'object',
            properties: {
                _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                userId: { type: 'string', example: '507f1f77bcf86cd799439012' },
                restaurantId: { type: 'string', example: '507f1f77bcf86cd799439013' },
                tableId: { type: 'string', example: '507f1f77bcf86cd799439014' },
                items: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            menuItemId: { type: 'string' },
                            name: { type: 'string', example: 'Phở bò' },
                            price: { type: 'number', example: 65000 },
                            quantity: { type: 'number', example: 2 },
                            note: { type: 'string', example: 'Không hành' },
                            category: { type: 'string', enum: ['FOOD', 'DRINK', 'DESSERT'], example: 'FOOD' }
                        }
                    }
                },
                totalAmount: { type: 'number', example: 130000 },
                status: { type: 'string', enum: ['PENDING', 'PAID', 'CANCELLED'], example: 'PENDING' },
                paymentMethod: { type: 'string', enum: ['BANK', 'MOMO', 'ZALOPAY', 'VNPAY'], nullable: true }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async create(@Body() createInvoiceDto: CreateInvoiceDto, @Req() req: any) {
        const userId = req.user?.userId;
        if (userId) {
            createInvoiceDto.userId = userId;
        }
        const invoice = await this.invoicesService.create(createInvoiceDto);
        return invoice;
    }

    @Get()
    @ApiBearerAuth('JWT')
    @ApiOperation({
        summary: 'Lấy danh sách hóa đơn của người dùng',
        description: 'Lấy tất cả hóa đơn của người dùng đang đăng nhập'
    })
    @ApiResponse({
        status: 200,
        description: 'Danh sách hóa đơn',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    restaurantId: { type: 'string' },
                    tableId: { type: 'string' },
                    items: { type: 'array' },
                    totalAmount: { type: 'number', example: 250000 },
                    status: { type: 'string', enum: ['PENDING', 'PAID', 'CANCELLED'], example: 'PENDING' },
                    paymentMethod: { type: 'string', enum: ['BANK', 'MOMO', 'ZALOPAY', 'VNPAY'], nullable: true },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async findUserInvoices(@Req() req: any) {
        const userId = req.user.userId;
        return this.invoicesService.findByUser(userId);
    }

    @Get(':id')
    @ApiBearerAuth('JWT')
    @ApiOperation({
        summary: 'Lấy chi tiết hóa đơn theo ID',
        description: 'Lấy thông tin chi tiết của một hóa đơn cụ thể'
    })
    @ApiParam({
        name: 'id',
        description: 'Invoice ID (MongoDB ObjectId)',
        type: String,
        example: '507f1f77bcf86cd799439011'
    })
    @ApiResponse({
        status: 200,
        description: 'Chi tiết hóa đơn',
        schema: {
            type: 'object',
            properties: {
                _id: { type: 'string' },
                userId: { type: 'string' },
                restaurantId: { type: 'string' },
                tableId: { type: 'string' },
                items: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            menuItemId: { type: 'string' },
                            name: { type: 'string' },
                            price: { type: 'number' },
                            quantity: { type: 'number' },
                            note: { type: 'string' },
                            category: { type: 'string', enum: ['FOOD', 'DRINK', 'DESSERT'] }
                        }
                    }
                },
                totalAmount: { type: 'number' },
                status: { type: 'string', enum: ['PENDING', 'PAID', 'CANCELLED'] },
                paymentMethod: { type: 'string', enum: ['BANK', 'MOMO', 'ZALOPAY', 'VNPAY'], nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
            }
        }
    })
    @ApiResponse({ status: 404, description: 'Invoice không tìm thấy' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async findOne(@Param('id') id: string) {
        const invoice = await this.invoicesService.findOne(id);
        return invoice;
    }
}
