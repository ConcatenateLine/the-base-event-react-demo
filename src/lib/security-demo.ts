import { 
  EventEmitter, 
  createEventEmitter,
  type EventEmitterConfig,
  type Middleware,
} from "the-base-event";

export interface SecurityDemoConfig extends EventEmitterConfig {
  security?: {
    enabled?: boolean;
    rateLimit?: number;
  };
}

export const createSecureEmitter = (config?: SecurityDemoConfig) => {
  return createEventEmitter({
    ...config,
    security: {
      enabled: true,
      rateLimit: config?.security?.rateLimit || 100,
    },
  });
};

export const createRateLimitMiddleware = (maxEvents: number, windowMs: number): Middleware => {
  const events: Map<string, number[]> = new Map();
  
  return async (event, next) => {
    const now = Date.now();
    const key = event.channel;
    const timestamps = events.get(key) || [];
    
    const recentTimestamps = timestamps.filter(ts => now - ts < windowMs);
    
    if (recentTimestamps.length >= maxEvents) {
      console.warn(`Rate limit exceeded for channel: ${key}`);
      return;
    }
    
    recentTimestamps.push(now);
    events.set(key, recentTimestamps);
    
    return next();
  };
};

export const createSanitizationMiddleware = (): Middleware => {
  return async (event, next) => {
    const sanitized = sanitizeEventData(event.data);
    event.data = sanitized;
    return next();
  };
};

const sanitizeEventData = (data: unknown): unknown => {
  if (typeof data === "string") {
    return data
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeEventData(item));
  }
  
  if (data && typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeEventData(value);
    }
    return sanitized;
  }
  
  return data;
};

export const createValidationMiddleware = (
  schema: Record<string, (value: unknown) => boolean>
): Middleware => {
  return async (event, next) => {
    const validator = schema[event.channel];
    
    if (validator && !validator(event.data)) {
      console.warn(`Validation failed for channel: ${event.channel}`);
      return;
    }
    
    return next();
  };
};

export const testRateLimiting = async () => {
  const emitter = createSecureEmitter({
    security: {
      enabled: true,
      rateLimit: 5,
    },
  });
  
  const channel = "test:rate-limit";
  const results: { emitted: boolean; timestamp: number }[] = [];
  
  for (let i = 0; i < 10; i++) {
    emitter.emit(channel, { sequence: i });
    results.push({ emitted: true, timestamp: Date.now() });
    await new Promise(r => setTimeout(r, 50));
  }
  
  const buffered = emitter.getBuffered(channel);
  emitter.destroy();
  
  return {
    attempted: results.length,
    buffered: buffered.length,
    dropped: results.length - buffered.length,
  };
};

export const testSanitization = () => {
  const emitter = new EventEmitter();
  const received: unknown[] = [];
  
  emitter.on("test:sanitize", (event) => {
    received.push(event.data);
  });
  
  const maliciousData = {
    name: "<script>alert('xss')</script>",
    description: "<img src=x onerror=alert(1)>",
    nested: {
      value: "<div onclick='bad()'>test</div>",
    },
  };
  
  emitter.emit("test:sanitize", maliciousData);
  
  emitter.destroy();
  
  return {
    original: maliciousData,
    received: received[0],
  };
};

export const createSecurityMiddlewareStack = () => {
  const stack: Middleware[] = [
    createRateLimitMiddleware(100, 1000),
    createSanitizationMiddleware(),
  ];
  
  return stack;
};
