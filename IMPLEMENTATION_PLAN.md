# E-commerce Event System Implementation Plan

## Scenario Overview

**Project**: Real-time E-commerce Notification System  
**Goal**: Test all `the-base-event` package characteristics in a realistic e-commerce workflow  
**Environment**: Next.js 16 with React 19

---

## Implementation Phases

### Phase 1: Core Event Infrastructure
**Objective**: Set up the basic event system for e-commerce operations

#### Task 1.1: Create Global Event Emitter
- [ ] Integrate `src/lib/emitter.ts` into the Next.js app
- [ ] Create a client-side provider component for the emitter
- [ ] Test basic emit/on functionality
- [ ] Verify event types are properly typed

#### Task 1.2: Define Event Channels
- [ ] Implement `order:created` channel
- [ ] Implement `order:updated` channel  
- [ ] Implement `payment:processed` channel
- [ ] Implement `payment:failed` channel
- [ ] Implement `inventory:low` channel
- [ ] Implement `user:login` / `user:logout` channels

#### Task 1.3: Test Event Flow
- [ ] Create test page to emit sample events
- [ ] Verify subscribers receive events
- [ ] Test unsubscribe functionality
- [ ] Measure performance (events/second)

---

### Phase 2: Buffer Strategies
**Objective**: Demonstrate intelligent event buffering with different strategies

#### Task 2.1: LRU Strategy Implementation
- [ ] Configure emitter with LRU buffer (maxSize: 10)
- [ ] Emit 15 events to a single channel
- [ ] Verify oldest 5 are evicted
- [ ] Verify most recent 10 are retained

#### Task 2.2: FIFO Strategy Implementation  
- [ ] Configure emitter with FIFO buffer
- [ ] Emit events and verify order of retention
- [ ] Compare behavior with LRU

#### Task 2.3: TTL Expiration
- [ ] Set TTL to 2 seconds
- [ ] Emit event, wait 3 seconds
- [ ] Verify event is automatically removed
- [ ] Test with multiple events

#### Task 2.4: Buffer Metrics
- [ ] Access buffer state via `getBuffered()`
- [ ] Display buffer utilization
- [ ] Monitor memory usage

---

### Phase 3: React Integration
**Objective**: Implement real-time UI updates using React hooks

#### Task 3.1: Global Emitter Provider
- [ ] Create `EventProvider` component (client component)
- [ ] Wrap application with provider in layout
- [ ] Verify emitter persists across navigation

#### Task 3.2: Event Subscription Hooks
- [ ] Implement order notifications list
- [ ] Implement live cart updates display
- [ ] Implement user activity feed
- [ ] Test cleanup on component unmount

#### Task 3.3: Event Emission from UI
- [ ] Create "Create Order" button with emit
- [ ] Create "Add to Cart" button with emit
- [ ] Test immediate event propagation

#### Task 3.4: Event History
- [ ] Store last N events in component state
- [ ] Display event timeline
- [ ] Implement clear history functionality

---

### Phase 4: SSR Compatibility
**Objective**: Test server-side rendering with event buffering

#### Task 4.1: Server-Side Event Emission
- [ ] Create Server Component that emits events
- [ ] Verify events are buffered (not lost)
- [ ] Check buffer contents after server render

#### Task 4.2: Client Hydration Replay
- [ ] Load page (triggers hydration)
- [ ] Verify buffered events replay to client
- [ ] Confirm events appear in UI after hydration

#### Task 4.3: Environment Detection
- [ ] Test `isSSR()` returns correct value
- [ ] Test `getEnvironment()` returns expected environment
- [ ] Handle SSR/CSR differences in components

#### Task 4.4: Manual Sync Mode
- [ ] Configure emitter with `syncMode: 'manual'`
- [ ] Emit events on server
- [ ] Manually trigger `replayServerEvents()`
- [ ] Verify sync behavior

---

### Phase 5: Security Features
**Objective**: Implement rate limiting and data sanitization

#### Task 5.1: Rate Limiting
- [ ] Configure rate limit (e.g., 10 events/second)
- [ ] Rapidly emit 20 events
- [ ] Verify excess events are blocked
- [ ] Monitor dropped event count

#### Task 5.2: XSS Sanitization
- [ ] Emit event with malicious script content
- [ ] Verify data is sanitized before storage
- [ ] Test nested object sanitization

#### Task 5.3: Middleware Stack
- [ ] Create combined security middleware
- [ ] Apply to global emitter
- [ ] Test full security pipeline

---

### Phase 6: Schema Validation
**Objective**: Validate event payloads with JSON Schema

#### Task 6.1: Order Validation
- [ ] Emit valid order event
- [ ] Verify validation passes
- [ ] Emit invalid order (missing fields)
- [ ] Verify validation fails with errors

#### Task 6.2: Payment Validation
- [ ] Test valid payment method enum
- [ ] Test invalid payment method rejection
- [ ] Test nested object validation

#### Task 6.3: Validation Middleware
- [ ] Create validation middleware for specific channels
- [ ] Attach to emitter
- [ ] Verify invalid events are rejected

---

### Phase 7: UI Dashboard
**Objective**: Create comprehensive demo interface

#### Task 7.1: Event Console
- [ ] Display all emitted events in real-time
- [ ] Show event channel, payload, timestamp
- [ ] Filter events by channel
- [ ] Clear event log

#### Task 7.2: Buffer Visualizer
- [ ] Show current buffer contents
- [ ] Display buffer strategy in use
- [ ] Show TTL countdown for each event

#### Task 7.3: Metrics Panel
- [ ] Display events per second
- [ ] Show active subscriptions count
- [ ] Monitor buffer utilization

#### Task 7.4: Controls
- [ ] Buttons to emit test events
- [ ] Dropdown to select buffer strategy
- [ ] Input to configure buffer size
- [ ] Toggle for security features

---

## Testing Scenarios

### Scenario 1: High-Volume Order Processing
```
1. Configure buffer with maxSize: 100
2. Emit 150 order events rapidly
3. Verify only 100 retained
4. Check oldest orders were evicted (LRU)
```

### Scenario 2: Cart Abandonment Recovery
```
1. User adds items to cart (emit cart:updated)
2. User leaves page (buffer retains events)
3. User returns (replayServerEvents)
4. Verify cart state is restored
```

### Scenario 3: Payment Failure Alert
```
1. Emit payment:failed event
2. Hook receives event immediately
3. Display alert notification
4. Log event for audit
```

### Scenario 4: Inventory Low Warning
```
1. Emit inventory:low when stock < threshold
2. Multiple subscribers receive event
3. Email service sends notification
4. Dashboard updates stock display
```

### Scenario 5: User Session Tracking
```
1. User logs in (user:login)
2. Track session events
3. User logs out (user:logout)
4. Verify all events in sequence
```

---

## Success Criteria

| Feature | Criterion |
|---------|-----------|
| EventEmitter | Events propagate to all subscribers |
| Buffer LRU | Oldest events evicted when full |
| Buffer FIFO | Events retained in emission order |
| TTL | Events expire after configured time |
| React Hooks | UI updates in real-time |
| SSR | Server events replay on client |
| Rate Limiting | Excess events blocked |
| Sanitization | XSS content neutralized |
| Validation | Invalid payloads rejected |

---

## File Deliverables

```
src/
├── app/
│   ├── page.tsx              # Main demo dashboard
│   ├── layout.tsx            # Root layout with provider
│   └── components/
│       ├── EventConsole.tsx  # Real-time event display
│       ├── BufferVisualizer.tsx
│       ├── MetricsPanel.tsx
│       └── ControlPanel.tsx
└── lib/
    ├── emitter.ts            # [EXISTING]
    ├── hooks/
    │   └── use-base-event.tsx  # [EXISTING]
    ├── buffer-demo.ts        # [EXISTING]
    ├── ssr-demo.ts          # [EXISTING]
    ├── security-demo.ts     # [EXISTING]
    └── validation-demo.ts   # [EXISTING]
```

---

## Execution Order

1. **Week 1**: Phase 1 (Core Infrastructure)
2. **Week 2**: Phase 2-3 (Buffer + React)
3. **Week 3**: Phase 4-5 (SSR + Security)
4. **Week 4**: Phase 6-7 (Validation + Dashboard)

---

## Notes

- Each feature should be tested independently first
- Document any unexpected behavior
- Compare real-world behavior vs controlled tests
- Note performance characteristics in production-like scenarios
