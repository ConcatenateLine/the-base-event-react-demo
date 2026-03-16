import { 
  EventEmitter, 
  createEventEmitter,
  type EventEmitterConfig,
  type BufferedEvent,
} from "the-base-event";

export interface BufferStrategyDemo {
  name: string;
  config: EventEmitterConfig;
  description: string;
}

export const bufferStrategies: BufferStrategyDemo[] = [
  {
    name: "LRU (Least Recently Used)",
    config: {
      buffer: {
        strategy: "lru",
        maxSize: 10,
        ttl: 5000,
      },
    },
    description: "Evicts least recently used events when buffer is full. Best for prioritizing recent events.",
  },
  {
    name: "FIFO (First In, First Out)",
    config: {
      buffer: {
        strategy: "fifo",
        maxSize: 10,
        ttl: 5000,
      },
    },
    description: "Evicts oldest events first when buffer is full. Preserves event order.",
  },
  {
    name: "Priority",
    config: {
      buffer: {
        strategy: "priority",
        maxSize: 10,
        ttl: 5000,
      },
    },
    description: "Prioritizes high-priority events. Low-priority events are evicted first.",
  },
];

export const createStrategyEmitter = (strategy: "lru" | "fifo" | "priority", maxSize = 10) => {
  return createEventEmitter({
    buffer: {
      strategy,
      maxSize,
      ttl: 5000,
    },
  });
};

export const simulateEvents = (
  emitter: EventEmitter,
  channel: string,
  count: number,
  delay = 100
): Promise<void> => {
  return new Promise((resolve) => {
    let current = 0;
    
    const interval = setInterval(() => {
      emitter.emit(channel, {
        id: `event-${current}`,
        data: { sequence: current, timestamp: Date.now() },
        timestamp: Date.now(),
      });
      current++;
      
      if (current >= count) {
        clearInterval(interval);
        resolve();
      }
    }, delay);
  });
};

export const getBufferState = (emitter: EventEmitter, channel: string): {
  buffered: BufferedEvent[];
  count: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
} => {
  const buffered = emitter.getBuffered(channel);
  
  return {
    buffered,
    count: buffered.length,
    oldestTimestamp: buffered.length > 0 ? buffered[0].timestamp : null,
    newestTimestamp: buffered.length > 0 ? buffered[buffered.length - 1].timestamp : null,
  };
};

export const testBufferOverflow = (strategy: "lru" | "fifo" | "priority") => {
  const emitter = createStrategyEmitter(strategy, 3);
  const channel = "test:overflow";
  
  emitter.emit(channel, { seq: 1 });
  emitter.emit(channel, { seq: 2 });
  emitter.emit(channel, { seq: 3 });
  
  const beforeOverflow = getBufferState(emitter, channel);
  
  emitter.emit(channel, { seq: 4 });
  emitter.emit(channel, { seq: 5 });
  
  const afterOverflow = getBufferState(emitter, channel);
  
  emitter.destroy();
  
  return {
    strategy,
    beforeOverflow,
    afterOverflow,
  };
};

export const testTTLExpiration = () => {
  const emitter = createEventEmitter({
    buffer: {
      strategy: "lru",
      maxSize: 10,
      ttl: 100,
    },
  });
  
  const channel = "test:ttl";
  
  emitter.emit(channel, { seq: 1 });
  
  return new Promise<{ expired: BufferedEvent[] }>((resolve) => {
    setTimeout(() => {
      const buffered = emitter.getBuffered(channel);
      emitter.destroy();
      resolve({ expired: buffered });
    }, 150);
  });
};

export const compareStrategies = async () => {
  const results: Record<string, {
    finalBuffer: BufferedEvent[];
    sequences: number[];
  }> = {};
  
  for (const strategy of ["lru", "fifo", "priority"] as const) {
    const emitter = createStrategyEmitter(strategy, 5);
    const channel = `test:${strategy}`;
    
    for (let i = 1; i <= 10; i++) {
      emitter.emit(channel, { sequence: i });
    }
    
    const buffered = emitter.getBuffered(channel);
    results[strategy] = {
      finalBuffer: buffered,
      sequences: buffered.map((e) => (e.data as { sequence: number }).sequence),
    };
    
    emitter.destroy();
  }
  
  return results;
};
