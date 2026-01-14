import { SseEventPayload } from '../interfaces/sse.interface';

export function matchRestaurant(event: SseEventPayload, restaurantId: string) {
  return event.restaurantId === restaurantId;
}

export function matchTable(event: SseEventPayload, tableId?: string) {
  if (!tableId) return true;
  return event.tableId === tableId;
}
