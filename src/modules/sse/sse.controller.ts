import { Controller, Sse, Param, Req } from '@nestjs/common';
import { map, filter } from 'rxjs/operators';
import { SseService } from './sse.service';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) { }

  @Sse('orders/:restaurantId')
  stream(@Param('restaurantId') restaurantId: string, @Req() req: any) {
    return this.sseService.stream$.pipe(
      filter((e) => e.restaurantId === restaurantId),
      map((e) => ({ data: e })),
    );
  }

  @Sse('user')
  streamUserOrders(@Req() req: any) {
    const userId = req.user?.userId;
    return this.sseService.stream$.pipe(
      filter((event) => event.userId === userId),
      map((event) => ({ data: event })),
    );
  }
}

