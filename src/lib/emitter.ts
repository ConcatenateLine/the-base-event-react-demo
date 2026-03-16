import { 
  EventEmitter, 
  createEventEmitter,
  type EventEmitterConfig,
  type EventCallback,
  type BufferedEvent,
  type BaseEvent,
} from "the-base-event";

export const DEFAULT_CONFIG: EventEmitterConfig = {
  buffer: {
    strategy: "lru",
    maxSize: 1000,
    ttl: 30000,
  },
};

export const createEcommerceEmitter = (config?: Partial<EventEmitterConfig>) => {
  return createEventEmitter({
    ...DEFAULT_CONFIG,
    ...config,
  });
};

export const ecommerceEvents = {
  ORDER_CREATED: "order:created",
  ORDER_UPDATED: "order:updated",
  ORDER_CANCELLED: "order:cancelled",
  PAYMENT_PROCESSED: "payment:processed",
  PAYMENT_FAILED: "payment:failed",
  INVENTORY_LOW: "inventory:low",
  USER_LOGIN: "user:login",
  USER_LOGOUT: "user:logout",
  NOTIFICATION_SENT: "notification:sent",
  CART_UPDATED: "cart:updated",
} as const;

export type EcommerceEventType = typeof ecommerceEvents[keyof typeof ecommerceEvents];

export interface OrderEvent {
  orderId: string;
  userId: string;
  total: number;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  timestamp: number;
}

export interface PaymentEvent {
  orderId: string;
  userId: string;
  amount: number;
  method: "credit_card" | "paypal" | "bank_transfer";
  status: "success" | "failed" | "pending";
  timestamp: number;
}

export interface InventoryEvent {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  timestamp: number;
}

export interface UserEvent {
  userId: string;
  email: string;
  name: string;
  timestamp: number;
}

export interface CartEvent {
  userId: string;
  productId: string;
  quantity: number;
  action: "add" | "remove" | "update";
  timestamp: number;
}

export type EcommerceEventPayload = 
  | OrderEvent 
  | PaymentEvent 
  | InventoryEvent 
  | UserEvent 
  | CartEvent;

export const createEventLogger = () => {
  const logs: Array<{ event: string; data: unknown; timestamp: number }> = [];
  
  const logger: EventCallback = (event: BaseEvent) => {
    logs.push({
      event: event.channel,
      data: event.data,
      timestamp: event.timestamp,
    });
  };

  return {
    logs,
    logger,
    clear: () => logs.length = 0,
  };
};

export { EventEmitter, createEventEmitter };
export type { EventEmitterConfig, EventCallback, BufferedEvent, BaseEvent };
