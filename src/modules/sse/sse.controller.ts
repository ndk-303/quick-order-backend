import { Controller, Sse, Param, Query, Req } from '@nestjs/common';
import { map, filter } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';
import { matchRestaurant, matchTable } from 'src/common/filters/sse.filter';
import { SseEventPayload } from 'src/common/interfaces/sse.interface';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  /**
   * Bếp + Khách đều dùng
   * - Bếp: chỉ truyền restaurantId
   * - Khách: truyền thêm tableId
   */
  @Sse('orders/:restaurantId')
  streamOrders(
    @Param('restaurantId') restaurantId: string,
    @Query('tableId') tableId?: string,
  ): Observable<MessageEvent> {
    return this.sseService.stream$.pipe(
      filter((event: SseEventPayload) =>
          matchRestaurant(event, restaurantId) && matchTable(event, tableId),
      ),
      map((event: SseEventPayload) => ({
        data: event,
      })),
    );
  }

  @Sse('orders/user')
  streamUserOrders(@Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId;

    return this.sseService.stream$.pipe(
      filter((event) => event.userId === userId),
      map((event) => ({ data: event })),
    );
  }
}
