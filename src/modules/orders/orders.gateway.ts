import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true, namespace: '/order' })
export class OrdersGateway {
  @WebSocketServer()
  server: Server;

  // 1. Khi Khách hoặc Bếp mở app, họ join vào "phòng" (room) của nhà hàng đó
  @SubscribeMessage('join_restaurant')
  async handleJoinRoom(
    @MessageBody() data: { restaurant_id: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(`restaurant_${data.restaurant_id}`);
  }

  notifyNewOrder(restaurantId: string, order: any) {
    this.server.to(`restaurant_${restaurantId}`).emit('new_order', order);
  }

  notifyOrderStatus(restaurantId: string, order: any) {
    this.server
      .to(`restaurant_${restaurantId}`)
      .emit('order_status_updated', order);
  }
}
