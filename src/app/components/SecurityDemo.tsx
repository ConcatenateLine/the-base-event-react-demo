"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  createEventEmitter,
  type EventEmitter,
  type Middleware,
} from "the-base-event";

const createRateLimitMiddleware = (maxEvents: number, windowMs: number): Middleware => {
  const events: Map<string, number[]> = new Map();
  
  return async (event, next) => {
    const now = Date.now();
    const key = event.channel;
    const timestamps = events.get(key) || [];
    
    const recentTimestamps = timestamps.filter(ts => now - ts < windowMs);
    
    if (recentTimestamps.length >= maxEvents) {
      return;
    }
    
    recentTimestamps.push(now);
    events.set(key, recentTimestamps);
    
    return next();
  };
};

const createSanitizationMiddleware = (): Middleware => {
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

export default function SecurityDemo() {
  const [rateLimit, setRateLimit] = useState(10);
  const [windowMs, setWindowMs] = useState(1000);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [rateLimitStats, setRateLimitStats] = useState({ attempted: 0, allowed: 0, blocked: 0 });
  const [sanitizationResult, setSanitizationResult] = useState<{original: unknown; sanitized: unknown} | null>(null);
  const [emitter, setEmitter] = useState<EventEmitter | null>(null);
  const [emitterReady, setEmitterReady] = useState(false);
  const [middlewareEnabled, setMiddlewareEnabled] = useState({ rateLimit: true, sanitization: true });
  const receivedEvents = useRef<unknown[]>([]);

  useEffect(() => {
    const middlewares: Middleware[] = [];
    if (middlewareEnabled.rateLimit) {
      middlewares.push(createRateLimitMiddleware(rateLimit, windowMs));
    }
    if (middlewareEnabled.sanitization) {
      middlewares.push(createSanitizationMiddleware());
    }

    const emp = createEventEmitter({ middleware: middlewares });
    setEmitter(emp);
    setEmitterReady(true);

    const unsub = emp.on("test:sanitize" as any, (data) => {
      receivedEvents.current.push(data);
    });

    return () => {
      unsub();
      emp.destroy();
    };
  }, [rateLimit, windowMs, middlewareEnabled]);

  const runTask5_1 = useCallback(async () => {
    if (!emitter) return;

    const channel = "test:rate-limit";
    let allowed = 0;
    let blocked = 0;

    for (let i = 0; i < 20; i++) {
      const before = emitter.getBuffered(channel).length;
      emitter.emit(channel, { sequence: i });
      const after = emitter.getBuffered(channel).length;
      
      if (after > before) {
        allowed++;
      } else {
        blocked++;
      }
    }

    setRateLimitStats({ attempted: 20, allowed, blocked });
    setTestResults((prev) => ({ ...prev, task5_1: blocked > 0 }));
  }, [emitter]);

  const runTask5_2 = useCallback(() => {
    if (!emitter) return;

    receivedEvents.current = [];
    
    const maliciousData = {
      name: "<script>alert('xss')</script>",
      description: "<img src=x onerror=alert(1)>",
      nested: {
        value: "<div onclick='bad()'>test</div>",
      },
    };

    emitter.emit("test:sanitize" as any, maliciousData);

    setTimeout(() => {
      const received = receivedEvents.current[0] as any;
      const isSanitized = received && 
        received.name?.includes("&lt;script&gt;") &&
        received.description?.includes("&lt;img");
      
      setSanitizationResult({ original: maliciousData, sanitized: received });
      setTestResults((prev) => ({ ...prev, task5_2: isSanitized }));
    }, 50);
  }, [emitter]);

  const runTask5_3 = useCallback(async () => {
    const stackEmitter = createEventEmitter({
      middleware: [
        createRateLimitMiddleware(5, 1000),
        createSanitizationMiddleware(),
      ],
    });

    let rateLimited = false;
    let sanitized = false;

    for (let i = 0; i < 7; i++) {
      stackEmitter.emit("test:stack", { index: i, data: "<script>bad</script>" });
    }

    const buffered = stackEmitter.getBuffered("test:stack");
    
    stackEmitter.on("test:stack" as any, (data: any) => {
      if (data.data?.includes("&lt;")) {
        sanitized = true;
      }
    });

    setTimeout(() => {
      setTestResults((prev) => ({ 
        ...prev, 
        task5_3: buffered.length < 7 && sanitized 
      }));
      stackEmitter.destroy();
    }, 100);
  }, []);

  const runAllTests = useCallback(() => {
    runTask5_1();
    setTimeout(() => {
      runTask5_2();
      runTask5_3();
    }, 200);
  }, [runTask5_1, runTask5_2, runTask5_3]);

  const resetTests = useCallback(() => {
    if (!emitter) return;
    emitter.clear();
    setRateLimitStats({ attempted: 0, allowed: 0, blocked: 0 });
    setSanitizationResult(null);
    setTestResults({});
    receivedEvents.current = [];
  }, [emitter]);

  if (!emitterReady) {
    return <div className="p-4 border border-zinc-300 rounded-lg bg-white">Loading...</div>;
  }

  return (
    <div className="border border-zinc-300 rounded-lg bg-white dark:bg-zinc-900 dark:border-zinc-700">
      <div className="border-b border-zinc-200 dark:border-zinc-700 p-4">
        <h2 className="text-xl font-semibold">Phase 5: Security Features</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Rate limiting and XSS sanitization
        </p>
      </div>

      <div className="p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Rate Limit (events/sec)</label>
            <input
              type="number"
              value={rateLimit}
              onChange={(e) => setRateLimit(Number(e.target.value))}
              className="w-full p-2 border border-zinc-300 rounded-md dark:bg-zinc-800 dark:border-zinc-600"
              min={1}
              max={100}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Window (ms)</label>
            <input
              type="number"
              value={windowMs}
              onChange={(e) => setWindowMs(Number(e.target.value))}
              className="w-full p-2 border border-zinc-300 rounded-md dark:bg-zinc-800 dark:border-zinc-600"
              min={100}
              max={10000}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Middleware</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={middlewareEnabled.rateLimit}
                  onChange={(e) => setMiddlewareEnabled(prev => ({ ...prev, rateLimit: e.target.checked }))}
                />
                <span className="text-sm">Rate Limit</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={middlewareEnabled.sanitization}
                  onChange={(e) => setMiddlewareEnabled(prev => ({ ...prev, sanitization: e.target.checked }))}
                />
                <span className="text-sm">Sanitization</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={runAllTests}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Run All Tests
          </button>
          <button
            onClick={runTask5_1}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          >
            Test 5.1: Rate Limit
          </button>
          <button
            onClick={runTask5_2}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          >
            Test 5.2: Sanitization
          </button>
          <button
            onClick={runTask5_3}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          >
            Test 5.3: Middleware Stack
          </button>
          <button
            onClick={resetTests}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-zinc-200 dark:border-zinc-700 rounded-md p-4">
            <h3 className="font-medium mb-2">Task 5.1: Rate Limiting</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Events Attempted:</span>
                <span className="font-mono">{rateLimitStats.attempted}</span>
              </div>
              <div className="flex justify-between">
                <span>Events Allowed:</span>
                <span className="font-mono text-green-600">{rateLimitStats.allowed}</span>
              </div>
              <div className="flex justify-between">
                <span>Events Blocked:</span>
                <span className="font-mono text-red-600">{rateLimitStats.blocked}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${(rateLimitStats.blocked / rateLimitStats.attempted) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="border border-zinc-200 dark:border-zinc-700 rounded-md p-4">
            <h3 className="font-medium mb-2">Task 5.2: XSS Sanitization</h3>
            {sanitizationResult ? (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-zinc-500">Original:</span>
                  <pre className="mt-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs overflow-x-auto">
                    {JSON.stringify(sanitizationResult.original, null, 2)}
                  </pre>
                </div>
                <div>
                  <span className="text-zinc-500">Sanitized:</span>
                  <pre className="mt-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs overflow-x-auto">
                    {JSON.stringify(sanitizationResult.sanitized, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">Run test to see sanitization results</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Task 5.3: Middleware Stack</h3>
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-md">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-mono">Incoming Event</span>
              <span className="text-zinc-400">→</span>
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-xs">
                Rate Limit Middleware
              </span>
              <span className="text-zinc-400">→</span>
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs">
                Sanitization Middleware
              </span>
              <span className="text-zinc-400">→</span>
              <span className="font-mono">Buffer / Subscribers</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Test Results</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-2 rounded text-center text-sm ${testResults.task5_1 ? "bg-green-100 dark:bg-green-900 text-green-700" : "bg-zinc-100 dark:bg-zinc-800"}`}>
              5.1 Rate Limit
              {testResults.task5_1 && <span className="ml-1">✓</span>}
            </div>
            <div className={`p-2 rounded text-center text-sm ${testResults.task5_2 ? "bg-green-100 dark:bg-green-900 text-green-700" : "bg-zinc-100 dark:bg-zinc-800"}`}>
              5.2 Sanitization
              {testResults.task5_2 && <span className="ml-1">✓</span>}
            </div>
            <div className={`p-2 rounded text-center text-sm ${testResults.task5_3 ? "bg-green-100 dark:bg-green-900 text-green-700" : "bg-zinc-100 dark:bg-zinc-800"}`}>
              5.3 Middleware Stack
              {testResults.task5_3 && <span className="ml-1">✓</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}