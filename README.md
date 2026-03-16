# The Base Event Demo

> Use-case implementation demonstrating the characteristics of the `the-base-event` npm package in a Next.js application.

## Overview

This project demonstrates practical, use-case usage of the-base-event package features in an e-commerce notification system. Unlike controlled unit tests, this implementation showcases how the library works in a realistic application environment.

## Features Implemented

### 1. Core EventEmitter (`src/lib/emitter.ts`)

**What it demonstrates:**
- Creating and configuring the EventEmitter
- Subscribing to events with `.on()`
- Emitting events with `.emit()`
- Unsubscribing with the returned function
- Event channel patterns

**Implementation Details:**
- `createEcommerceEmitter()` - Factory function with default configuration
- Predefined event channels for e-commerce: `ORDER_CREATED`, `PAYMENT_PROCESSED`, `USER_LOGIN`, etc.
- Event types: `OrderEvent`, `PaymentEvent`, `InventoryEvent`, `UserEvent`, `CartEvent`
- Event logger utility for debugging

**Usage:**
```typescript
import { createEcommerceEmitter, ecommerceEvents } from '@/lib/emitter';

const emitter = createEcommerceEmitter();

emitter.on(ecommerceEvents.ORDER_CREATED, (event) => {
  console.log('Order received:', event.data);
});

emitter.emit(ecommerceEvents.ORDER_CREATED, {
  orderId: 'ORD-001',
  userId: 'user-123',
  total: 99.99,
  items: [],
  timestamp: Date.now(),
});
```

---

### 2. Buffer Strategies (`src/lib/buffer-demo.ts`)

**What it demonstrates:**
- LRU (Least Recently Used) strategy
- FIFO (First In, First Out) strategy  
- Priority strategy
- TTL (Time To Live) expiration
- Buffer overflow handling
- Memory management

**Implementation Details:**
- `createStrategyEmitter()` - Creates emitter with specified buffer strategy
- `simulateEvents()` - Generates test events with configurable delay
- `getBufferState()` - Inspects current buffer contents
- `testBufferOverflow()` - Tests behavior when buffer exceeds maxSize
- `testTTLExpiration()` - Tests time-based expiration
- `compareStrategies()` - Side-by-side comparison of all strategies

**Strategy Characteristics:**
| Strategy | Behavior | Best For |
|----------|----------|----------|
| LRU | Evicts least recently used | Prioritizing recent events |
| FIFO | Evicts oldest first | Preserving event order |
| Priority | High-priority events stay | Critical event handling |

**Usage:**
```typescript
import { createStrategyEmitter, simulateEvents, getBufferState } from '@/lib/buffer-demo';

const emitter = createStrategyEmitter('lru', 10);
await simulateEvents(emitter, 'orders', 5);

const state = getBufferState(emitter, 'orders');
console.log('Buffered events:', state.count);
```

---

### 3. React Integration (`src/lib/hooks/use-base-event.tsx`)

**What it demonstrates:**
- React hook for subscribing to events
- Global emitter singleton pattern
- Event channel with history
- Real-time event streaming
- Cleanup on unmount

**Implementation Details:**
- `useBaseEvent()` - Subscribe to a channel with callback
- `useEmit()` - Hook to emit events from components
- `useEventEmitter()` - Full emitter control with subscribe/publish
- `useEventChannel()` - Channel with event history
- `getGlobalEmitter()` - Shared emitter instance

**Usage:**
```tsx
import { useBaseEvent, useEmit } from '@/lib/hooks/use-base-event';

function OrderNotification() {
  useBaseEvent('order:created', (event) => {
    console.log('New order:', event.data);
  });
  
  return <div>Listening for orders...</div>;
}

function OrderForm() {
  const { emit } = useEmit();
  
  const handleSubmit = () => {
    emit('order:created', { orderId: 'ORD-001', total: 99.99 });
  };
  
  return <button onClick={handleSubmit}>Create Order</button>;
}
```

---

### 4. SSR Compatibility (`src/lib/ssr-demo.ts`)

**What it demonstrates:**
- Server-side event buffering
- Client-side hydration and replay
- Environment detection (SSR vs CSR)
- Deferred event emission
- Hydration state management

**Implementation Details:**
- `createSSREmitter()` - Creates emitter with SSR config
- `getEnvironmentInfo()` - Detects current environment
- `createHydrationDemo()` - HydrationManager wrapper
- `createBufferSyncDemo()` - BufferSyncManager for cross-environment sync
- `simulateServerSideEvents()` - Emit events on server
- `simulateClientHydration()` - Replay events after client hydration

**SSR Modes:**
| Mode | Behavior |
|------|----------|
| immediate | Sync events right away |
| on-hydration | Wait for framework hydration |
| manual | Developer controls when to replay |

**Usage:**
```typescript
// Server-side (Server Component)
import { createSSREmitter } from '@/lib/ssr-demo';

const emitter = createSSREmitter();
emitter.emit('order:created', orderData);

// Client-side (after hydration)
emitter.replayServerEvents();
```

---

### 5. Security Features (`src/lib/security-demo.ts`)

**What it demonstrates:**
- Rate limiting middleware
- XSS sanitization
- Input validation middleware
- Security middleware stack

**Implementation Details:**
- `createRateLimitMiddleware()` - Limits events per time window
- `createSanitizationMiddleware()` - Sanitizes event data
- `createValidationMiddleware()` - Schema-based validation
- `createSecurityMiddlewareStack()` - Combines all security middleware
- `testRateLimiting()` - Demonstrates rate limit behavior
- `testSanitization()` - Shows XSS prevention

**Usage:**
```typescript
import { createSecureEmitter, createRateLimitMiddleware } from '@/lib/security-demo';

const emitter = createSecureEmitter({
  security: {
    enabled: true,
    rateLimit: 100, // 100 events per second
  }
});

// Or add middleware manually
emitter.use(createRateLimitMiddleware(50, 1000));
```

---

### 6. Schema Validation (`src/lib/validation-demo.ts`)

**What it demonstrates:**
- JSON Schema-style validation
- Type-safe event payloads
- Custom schemas for different event types
- Validation error handling

**Implementation Details:**
- Predefined schemas: `orderSchema`, `userSchema`, `paymentSchema`, `inventorySchema`
- `validate()` - Validate data against schema
- `validateEventData()` - Validate event payload
- `isValid()` - Quick boolean check
- `createSchemaRegistry()` - Registry for multiple schemas
- `createSchemaValidator()` - Create reusable validator function

**Usage:**
```typescript
import { validate, isValid, orderSchema } from '@/lib/validation-demo';

const order = {
  orderId: 'ORD-001',
  userId: 'user-123',
  total: 99.99,
  items: [],
  timestamp: Date.now(),
};

const result = validate(order, orderSchema);

if (isValid(result.valid, orderSchema)) {
  console.log('Order is valid!');
} else {
  console.log('Validation errors:', result.errors);
}
```

---

## Project Structure

```
src/
├── lib/
│   ├── emitter.ts              # Core EventEmitter setup
│   ├── hooks/
│   │   └── use-base-event.tsx  # React hooks
│   ├── buffer-demo.ts          # Buffer strategy demos
│   ├── ssr-demo.ts            # SSR compatibility demos
│   ├── security-demo.ts       # Security middleware demos
│   └── validation-demo.ts    # Schema validation demos
└── app/
    ├── page.tsx               # Main demo page
    └── layout.tsx             # Root layout
```

---

## Getting Started

1. **Install dependencies:**
```bash
npm install
```

2. **Run development server:**
```bash
npm run dev
```

3. **Open browser:**
Navigate to `http://localhost:3000` to see the demo.

---

## Testing the Features

### Manual Testing Checklist

- [ ] **EventEmitter**: Create emitter, subscribe, emit, verify callback fires
- [ ] **Buffer**: Emit more events than maxSize, verify oldest are evicted
- [ ] **TTL**: Wait for TTL to expire, verify events are removed
- [ ] **React**: Use hooks in components, verify cleanup on unmount
- [ ] **SSR**: Check environment detection, test hydration replay
- [ ] **Security**: Send rapid events, verify rate limiting works
- [ ] **Validation**: Send invalid data, verify validation errors

---

## API Reference

### EventEmitter Options

```typescript
interface EventEmitterConfig {
  buffer?: {
    strategy: 'lru' | 'fifo' | 'priority';
    maxSize: number;
    ttl: number;
  };
  security?: {
    enabled: boolean;
    rateLimit: number;
  };
  middleware?: Middleware[];
  ssr?: {
    enabled: boolean;
    syncMode: 'immediate' | 'on-hydration' | 'manual';
  };
}
```

### Event Types

```typescript
interface OrderEvent {
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
```

---

## References

- [the-base-event npm package](https://www.npmjs.com/package/the-base-event)
- [GitHub Repository](https://github.com/ConcatenateLine/the-base-event)

---

## License

MIT
