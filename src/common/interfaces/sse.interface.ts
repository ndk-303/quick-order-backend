export enum SseEventType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_STATUS_UPDATED = 'INVOICE_STATUS_UPDATED',
}

export interface SseEventPayload {
  type: SseEventType;
  restaurantId?: string;
  tableId?: string;
  userId?: string;
  payload: any;
  createdAt?: Date;
}
