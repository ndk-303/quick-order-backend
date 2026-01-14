import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { SseEventPayload } from 'src/common/interfaces/sse.interface';

@Injectable()
export class SseService implements OnModuleDestroy {
  private readonly event$ = new Subject<SseEventPayload>();

  emit(event: SseEventPayload) {
    this.event$.next({
      ...event,
      createdAt: new Date(),
    });
  }

  get stream$(): Observable<SseEventPayload> {
    return this.event$.asObservable();
  }

  onModuleDestroy() {
    this.event$.complete();
  }
}
