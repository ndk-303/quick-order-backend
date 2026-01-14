import { Controller, Sse, Param, Req } from '@nestjs/common';
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
    return this.sseService.stream$.pipe(
      filter((e) => e.restaurantId === restaurantId),
      map((e) => ({ data: e })),
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
