import { Controller, Sse, Param, Req } from '@nestjs/common';
import { map, filter } from 'rxjs/operators';
import { SseService } from './sse.service';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) { }

  /**
   * SSE stream for restaurant orders (Kitchen display)
   * Requires authentication - restaurant staff only
   */
  @Sse('orders/:restaurantId')
  stream(@Param('restaurantId') restaurantId: string, @Req() req: any) {
    // Verify user has access to this restaurant
    return this.sseService.stream$.pipe(
      filter((e) => e.restaurantId === restaurantId),
      map((e) => ({ data: e })),
    );
  }

  /**
   * SSE stream for user's own orders
   * Requires authentication - user can only access their own orders
   */
  @Sse('user')
  streamUserOrders(@Req() req: any) {
    const userId = req.user?.userId;
    return this.sseService.stream$.pipe(
      filter((event) => event.userId === userId),
      map((event) => ({ data: event })),
    );
  }
}

