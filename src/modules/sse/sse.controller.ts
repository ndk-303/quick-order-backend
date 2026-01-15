import { Controller, Sse, Param } from '@nestjs/common';
import { map, filter } from 'rxjs/operators';
import { SseService } from './sse.service';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  /**
   * Bếp + Khách đều dùng
   * - Bếp: chỉ truyền restaurantId
   * - Khách: truyền thêm tableId
   */
  @Public()
  @Sse('orders/:restaurantId')
  stream(@Param('restaurantId') restaurantId: string) {
    console.log(restaurantId);
    return this.sseService.stream$.pipe(
      filter((e) => e.restaurantId === restaurantId),
      map((e) => ({ data: e })),
    );
  }

  @Public()
  @Sse('user/:userId')
  streamUserOrders(@Param('userId') userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    return this.sseService.stream$.pipe(
      filter((event) => event.userId === userId),
      map((event) => ({ data: event })),
    );
  }
}
