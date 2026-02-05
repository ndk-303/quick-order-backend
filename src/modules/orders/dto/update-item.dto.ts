import { OrderStatus } from '../schemas/order.schema';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrderItemStatusDto {
  @ApiProperty({
    description: 'ID của đơn hàng',
    example: '507f1f77bcf86cd799439011',
    type: String
  })
  orderId: string;

  @ApiProperty({
    description: 'ID của món ăn (menuItemId)',
    example: '507f1f77bcf86cd799439012',
    type: String
  })
  itemId: string;

  @ApiProperty({
    description: 'Trạng thái mới của món ăn',
    enum: OrderStatus,
    example: OrderStatus.COOKING
  })
  status: OrderStatus;
}
