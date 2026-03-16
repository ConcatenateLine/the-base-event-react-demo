"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useEventContext } from "./EventProvider";
import { ecommerceEvents, type BaseEvent } from "@/lib/emitter";

type BufferStrategy = "lru" | "fifo";

interface BufferedEventDisplay extends BaseEvent {
  ttlRemaining?: number;
}

export default function BufferDemo() {
  const { subscribe, publish, getBuffered, getMetrics, clear, isReady } = useEventContext();
  
  const [strategy, setStrategy] = useState<BufferStrategy>("lru");
  const [maxSize, setMaxSize] = useState(10);
  const [ttl, setTtl] = useState(0);
  const [bufferedEvents, setBufferedEvents] = useState<BufferedEventDisplay[]>([]);
  const [metrics, setMetrics] = useState({ bufferUtilization: 0, activeSubscriptions: 0 });
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);
  
  const channel = "buffer:test";
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const eventCounterRef = useRef(0);

  useEffect(() => {
    if (!isReady) return;

    const unsub = subscribe(channel, () => {});
    unsubscribeRef.current = unsub;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [isReady, subscribe]);

  useEffect(() => {
    if (!isReady) return;

    const updateBufferedEvents = () => {
      const events = getBuffered(channel) as BufferedEventDisplay[];
      const now = Date.now();
      
      const eventsWithTtl = events.map((event) => ({
        ...event,
        ttlRemaining: ttl > 0 ? Math.max(0, ttl - (now - event.timestamp)) : undefined,
      }));
      
      setBufferedEvents(eventsWithTtl);
      const currentMetrics = getMetrics();
      setMetrics({
        bufferUtilization: currentMetrics.bufferUtilization,
        activeSubscriptions: currentMetrics.activeSubscriptions,
      });
    };

    updateBufferedEvents();
    const interval = setInterval(updateBufferedEvents, 500);
    return () => clearInterval(interval);
  }, [isReady, getBuffered, getMetrics, channel, ttl]);

  const emitTestEvent = useCallback((label: string) => {
    eventCounterRef.current += 1;
    publish(channel, {
      id: eventCounterRef.current,
      label,
      timestamp: Date.now(),
    });
  }, [publish, channel]);

  const runLruTest = useCallback(async () => {
    setIsRunningTest(true);
    setTestResults([]);
    clear(channel);
    eventCounterRef.current = 0;

    setTestResults((prev) => [...prev, "=== LRU Strategy Test ==="]);
    setTestResults((prev) => [...prev, `Config: strategy=lru, maxSize=${maxSize}`]);
    
    await new Promise((r) => setTimeout(r, 100));
    
    for (let i = 1; i <= 15; i++) {
      emitTestEvent(`Event-${i}`);
      await new Promise((r) => setTimeout(r, 10));
    }
    
    await new Promise((r) => setTimeout(r, 100));
    
    const remaining = getBuffered(channel);
    setTestResults((prev) => [
      ...prev,
      `Emitted: 15 events`,
      `Buffer size: ${maxSize}`,
      `Retained: ${remaining.length} events`,
      `Expected: ${maxSize} events (oldest 5 evicted)`,
      `Result: ${remaining.length === maxSize ? "✓ PASS" : "✗ FAIL"}`,
      "",
    ]);
    
    setIsRunningTest(false);
  }, [maxSize, emitTestEvent, getBuffered, channel, clear]);

  const runFifoTest = useCallback(async () => {
    setIsRunningTest(true);
    setTestResults([]);
    clear(channel);
    eventCounterRef.current = 0;

    setTestResults((prev) => [...prev, "=== FIFO Strategy Test ==="]);
    setTestResults((prev) => [...prev, `Config: strategy=fifo, maxSize=${maxSize}`]);
    
    await new Promise((r) => setTimeout(r, 100));
    
    for (let i = 1; i <= 15; i++) {
      emitTestEvent(`Event-${i}`);
      await new Promise((r) => setTimeout(r, 10));
    }
    
    await new Promise((r) => setTimeout(r, 100));
    
    const remaining = getBuffered(channel);
    const firstEvent = remaining[0]?.data as { label?: string };
    const lastEvent = remaining[remaining.length - 1]?.data as { label?: string };
    
    setTestResults((prev) => [
      ...prev,
      `Emitted: 15 events`,
      `Buffer size: ${maxSize}`,
      `Retained: ${remaining.length} events`,
      `First retained: ${firstEvent?.label || "N/A"}`,
      `Last retained: ${lastEvent?.label || "N/A"}`,
      `Expected: Events 6-15 retained (first ${maxSize} events)`,
      `Result: ${remaining.length === maxSize ? "✓ PASS" : "✗ FAIL"}`,
      "",
    ]);
    
    setIsRunningTest(false);
  }, [maxSize, emitTestEvent, getBuffered, channel, clear]);

  const runTtlTest = useCallback(async () => {
    setIsRunningTest(true);
    setTestResults([]);
    clear(channel);
    eventCounterRef.current = 0;

    const ttlMs = 2000;
    setTestResults((prev) => [...prev, "=== TTL Expiration Test ==="]);
    setTestResults((prev) => [...prev, `Config: TTL=${ttlMs}ms`]);
    
    await new Promise((r) => setTimeout(r, 100));
    
    emitTestEvent("Event-1 (will expire)");
    await new Promise((r) => setTimeout(r, 100));
    emitTestEvent("Event-2");
    
    await new Promise((r) => setTimeout(r, 100));
    let afterEmit = getBuffered(channel);
    setTestResults((prev) => [
      ...prev,
      `Emitted 2 events`,
      `Buffer count: ${afterEmit.length}`,
    ]);
    
    setTestResults((prev) => [...prev, `Waiting ${ttlMs + 1000}ms for TTL expiration...`]);
    await new Promise((r) => setTimeout(r, ttlMs + 1000));
    
    const afterExpiry = getBuffered(channel);
    setTestResults((prev) => [
      ...prev,
      `After TTL: ${afterExpiry.length} events remaining`,
      `Expected: 0 events (all expired)`,
      `Result: ${afterExpiry.length === 0 ? "✓ PASS" : "✗ FAIL"}`,
      "",
    ]);
    
    setIsRunningTest(false);
  }, [emitTestEvent, getBuffered, channel, clear]);

  const runAllTests = useCallback(async () => {
    setIsRunningTest(true);
    setTestResults([]);
    clear(channel);
    eventCounterRef.current = 0;

    setTestResults((prev) => [...prev, "=== Running All Buffer Strategy Tests ===", ""]);
    
    await runLruTest();
    await new Promise((r) => setTimeout(r, 500));
    await runFifoTest();
    await new Promise((r) => setTimeout(r, 500));
    await runTtlTest();
    
    setTestResults((prev) => [...prev, "=== All Tests Complete ==="]);
    setIsRunningTest(false);
  }, [runLruTest, runFifoTest, runTtlTest, clear, channel]);

  const handleClear = useCallback(() => {
    clear(channel);
    setTestResults([]);
  }, [clear, channel]);

  if (!isReady) {
    return <div className="p-4">Loading buffer system...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">Buffer Strategies Demo</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-4">
            <h3 className="font-medium mb-2">Buffer Configuration</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-zinc-500 mb-1">Strategy</label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as BufferStrategy)}
                  className="w-full px-3 py-2 rounded bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600"
                >
                  <option value="lru">LRU (Least Recently Used)</option>
                  <option value="fifo">FIFO (First In First Out)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-500 mb-1">Max Size</label>
                <input
                  type="number"
                  value={maxSize}
                  onChange={(e) => setMaxSize(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="w-full px-3 py-2 rounded bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-500 mb-1">TTL (ms, 0 = no expiry)</label>
                <input
                  type="number"
                  value={ttl}
                  onChange={(e) => setTtl(Number(e.target.value))}
                  min={0}
                  step={1000}
                  className="w-full px-3 py-2 rounded bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600"
                />
              </div>
            </div>
          </div>

          <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-4">
            <h3 className="font-medium mb-2">Run Tests</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={runLruTest}
                disabled={isRunningTest}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Test LRU (15 events → 10 kept)
              </button>
              <button
                onClick={runFifoTest}
                disabled={isRunningTest}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Test FIFO (15 events → 10 kept)
              </button>
              <button
                onClick={runTtlTest}
                disabled={isRunningTest}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                Test TTL (2s expiration)
              </button>
              <button
                onClick={runAllTests}
                disabled={isRunningTest}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isRunningTest ? "Running..." : "Run All Tests"}
              </button>
              <button
                onClick={handleClear}
                disabled={isRunningTest}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                Clear Buffer
              </button>
            </div>
          </div>

          <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-4">
            <h3 className="font-medium mb-2">Buffer Metrics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Strategy:</span>
                <span className="font-mono uppercase">{strategy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Max Size:</span>
                <span className="font-mono">{maxSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">TTL:</span>
                <span className="font-mono">{ttl === 0 ? "None" : `${ttl}ms`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Buffered:</span>
                <span className="font-mono">{bufferedEvents.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Utilization:</span>
                <span className="font-mono">{(metrics.bufferUtilization * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="font-medium mb-2">Test Results</h3>
            <div className="bg-zinc-900 text-zinc-100 rounded p-4 h-48 overflow-y-auto font-mono text-sm">
              {testResults.length === 0 ? (
                <span className="text-zinc-500">Run a test to see results...</span>
              ) : (
                testResults.map((line, i) => (
                  <div key={i} className={line.startsWith("===") ? "text-yellow-400 mt-2" : ""}>
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Buffered Events</h3>
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 h-48 overflow-y-auto">
              {bufferedEvents.length === 0 ? (
                <p className="p-4 text-zinc-500 text-center">No events in buffer</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-zinc-100 dark:bg-zinc-700 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium">#</th>
                      <th className="px-2 py-1 text-left font-medium">Event</th>
                      <th className="px-2 py-1 text-left font-medium">TTL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bufferedEvents.map((event, idx) => (
                      <tr key={event.id || idx} className="border-t border-zinc-200 dark:border-zinc-700">
                        <td className="px-2 py-1 font-mono text-xs">{idx + 1}</td>
                        <td className="px-2 py-1 font-mono text-xs">
                          {(event.data as { label?: string })?.label || JSON.stringify(event.data).slice(0, 20)}
                        </td>
                        <td className="px-2 py-1 font-mono text-xs">
                          {event.ttlRemaining !== undefined ? `${(event.ttlRemaining / 1000).toFixed(1)}s` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-4">
          <h3 className="font-medium mb-2">Manual Event Emission</h3>
          <div className="flex gap-2">
            <button
              onClick={() => emitTestEvent(`Manual-${Date.now()}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Emit Single Event
            </button>
            <button
              onClick={() => {
                for (let i = 0; i < 5; i++) {
                  emitTestEvent(`Batch-${i + 1}`);
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Emit 5 Events
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
