import { OrderStatus } from '../schemas/order.schema';

export class UpdateOrderItemStatusDto {
  orderId: string;
  itemId: string;
  status: OrderStatus;
}
