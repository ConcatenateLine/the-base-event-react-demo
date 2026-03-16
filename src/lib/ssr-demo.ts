import { 
  EventEmitter, 
  createEventEmitter,
  isSSR,
  getEnvironment,
  HydrationManager,
  BufferSyncManager,
  type SSRConfig,
} from "the-base-event";

export interface SSRDemoConfig {
  enableBufferSync?: boolean;
  syncMode?: "immediate" | "on-hydration" | "manual";
}

export const createSSREmitter = (config?: SSRDemoConfig) => {
  return createEventEmitter({
    ssr: {
      enabled: true,
      syncMode: config?.syncMode || "on-hydration",
    },
  });
};

export const getEnvironmentInfo = () => {
  return {
    isSSR: isSSR(),
    environment: getEnvironment(),
  };
};

export const createHydrationDemo = () => {
  const hydrationManager = new HydrationManager({
    enableAutoSync: true,
    syncMode: "on-hydration",
  } as Partial<SSRConfig>);
  
  return {
    manager: hydrationManager,
    markHydrated: () => hydrationManager.markHydrated(),
    waitForHydration: () => hydrationManager.waitForHydration(),
    getState: () => hydrationManager.getState(),
  };
};

export const createBufferSyncDemo = () => {
  const syncManager = new BufferSyncManager("hybrid", "on-hydration");
  
  return {
    manager: syncManager,
    bufferServerEvent: (events: Array<{ id: string; channel: string; data: unknown; timestamp: number }>) => {
      events.forEach(event => {
        syncManager.bufferServerEvent({
          id: event.id,
          channel: event.channel,
          data: event.data,
          timestamp: event.timestamp,
          bufferedAt: event.timestamp,
        });
      });
    },
    replayServerEvents: () => syncManager.replayServerEvents(),
    getPendingCount: () => syncManager.getServerBuffer().length,
  };
};

export const simulateServerSideEvents = (emitter: EventEmitter) => {
  console.log("Simulating server-side event emission...");
  
  emitter.emit("order:created", {
    orderId: "ORD-001",
    userId: "user-123",
    items: [{ productId: "prod-1", quantity: 2, price: 29.99 }],
    total: 59.98,
    timestamp: Date.now(),
  });
  
  emitter.emit("user:login", {
    userId: "user-123",
    email: "user@example.com",
    timestamp: Date.now(),
  });
  
  const buffered = emitter.getBuffered("order:created");
  console.log(`Buffered ${buffered.length} events for client hydration`);
  
  return buffered;
};

export const simulateClientHydration = async (emitter: EventEmitter) => {
  console.log("Simulating client-side hydration...");
  
  const beforeReplay = emitter.getBuffered("order:created").length;
  console.log(`Events before replay: ${beforeReplay}`);
  
  await emitter.waitForHydration();
  
  emitter.replayServerEvents();
  
  const afterReplay = emitter.getBuffered("order:created").length;
  console.log(`Events after replay: ${afterReplay}`);
  
  return {
    beforeReplay,
    afterReplay,
  };
};

export const SSRFeatureFlags = {
  BUFFER_SYNC: "bufferSync",
  CLIENT_WAIT: "clientWait",
  HYDRATION_DETECTION: "hydrationDetection",
  DEFERRED_EMIT: "deferredEmit",
} as const;

export const testSSRDetection = () => {
  const results = {
    initial: getEnvironmentInfo(),
    afterEmitter: {} as ReturnType<typeof getEnvironmentInfo>,
  };
  
  const emitter = createSSREmitter();
  results.afterEmitter = getEnvironmentInfo();
  
  emitter.destroy();
  
  return results;
};

export const createDeferredEventDemo = () => {
  const emitter = createSSREmitter({ syncMode: "manual" });
  const deferredEvents: Array<{ channel: string; data: unknown; timestamp: number }> = [];
  
  const publishDeferred = <T>(channel: string, data: T) => {
    if (emitter.isSSR()) {
      deferredEvents.push({ channel, data, timestamp: Date.now() });
      console.log(`Deferred event: ${channel}`);
    } else {
      emitter.emit(channel, data);
    }
  };
  
  const flushDeferred = () => {
    deferredEvents.forEach((event) => {
      emitter.emit(event.channel, event.data);
    });
    deferredEvents.length = 0;
  };
  
  return {
    emitter,
    publishDeferred,
    flushDeferred,
    pendingCount: deferredEvents.length,
  };
};
