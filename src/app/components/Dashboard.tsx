"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useEventContext } from "./EventProvider";
import { ecommerceEvents, type BaseEvent } from "@/lib/emitter";

interface EventLog {
  id: string;
  channel: string;
  data: unknown;
  timestamp: number;
}

interface BufferedEventDisplay extends BaseEvent {
  ttlRemaining?: number;
}

const ALL_CHANNELS = [
  "all",
  ecommerceEvents.ORDER_CREATED,
  ecommerceEvents.ORDER_UPDATED,
  ecommerceEvents.PAYMENT_PROCESSED,
  ecommerceEvents.PAYMENT_FAILED,
  ecommerceEvents.INVENTORY_LOW,
  ecommerceEvents.USER_LOGIN,
  ecommerceEvents.USER_LOGOUT,
];

type BufferStrategy = "lru" | "fifo";

export default function Dashboard() {
  const { subscribe, publish, getBuffered, getMetrics, clear, isReady, updateConfig } = useEventContext();
  
  const [activeTab, setActiveTab] = useState<"events" | "buffer" | "metrics">("events");
  
  const [events, setEvents] = useState<EventLog[]>([]);
  const [channelFilter, setChannelFilter] = useState("all");
  
  const [bufferStrategy, setBufferStrategy] = useState<BufferStrategy>("lru");
  const [bufferSize, setBufferSize] = useState(50);
  const [bufferedEvents, setBufferedEvents] = useState<BufferedEventDisplay[]>([]);
  const [ttl, setTtl] = useState(0);
  
  const [metrics, setMetrics] = useState({ eventsPerSecond: 0, bufferUtilization: 0, activeSubscriptions: 0 });
  
  const [securityEnabled, setSecurityEnabled] = useState(false);
  
  const testChannel = "dashboard:test";
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isReady) return;

    const unsub = subscribe(testChannel, () => {});
    unsubscribeRef.current = unsub;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [isReady, subscribe]);

  useEffect(() => {
    if (!isReady) return;

    const unsubscribers = ALL_CHANNELS.filter(c => c !== "all").map((channel) => {
      return subscribe(channel as string, (event) => {
        setEvents((prev) => {
          const newEvent = {
            id: event.id,
            channel: event.channel,
            data: event.data,
            timestamp: event.timestamp,
          };
          return [newEvent, ...prev].slice(0, 100);
        });
      });
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [isReady, subscribe]);

  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      setMetrics(getMetrics());
      const events = getBuffered(testChannel) as BufferedEventDisplay[];
      const now = Date.now();
      setBufferedEvents(events.map(e => ({
        ...e,
        ttlRemaining: ttl > 0 ? Math.max(0, ttl - (now - e.timestamp)) : undefined,
      })));
    }, 1000);

    return () => clearInterval(interval);
  }, [isReady, getMetrics, getBuffered, ttl, testChannel]);

  const emitTestEvent = useCallback((channel: string) => {
    if (!isReady) return;
    publish(channel, { 
      testData: `Event at ${Date.now()}`,
      source: "dashboard" 
    });
  }, [isReady, publish]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const clearBuffer = useCallback(() => {
    if (!isReady) return;
    clear(testChannel);
    setBufferedEvents([]);
  }, [isReady, clear, testChannel]);

  const updateBufferConfig = useCallback((strategy: BufferStrategy, size: number) => {
    setBufferStrategy(strategy);
    setBufferSize(size);
    if (isReady) {
      updateConfig({ buffer: { strategy, maxSize: size } });
    }
  }, [isReady, updateConfig]);

  const filteredEvents = channelFilter === "all" 
    ? events 
    : events.filter(e => e.channel === channelFilter);

  if (!isReady) {
    return <div className="p-4 border border-zinc-300 rounded-lg bg-white">Loading...</div>;
  }

  return (
    <div className="border border-zinc-300 rounded-lg bg-white dark:bg-zinc-900 dark:border-zinc-700">
      <div className="border-b border-zinc-200 dark:border-zinc-700 p-4">
        <h2 className="text-xl font-semibold">Phase 7: UI Dashboard</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Consolidated event console, buffer visualizer, and controls
        </p>
      </div>

      <div className="p-4">
        <div className="flex gap-2 mb-4 border-b border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setActiveTab("events")}
            className={`px-4 py-2 -mb-px border-b-2 ${activeTab === "events" ? "border-blue-600 text-blue-600" : "border-transparent"}`}
          >
            Event Console
          </button>
          <button
            onClick={() => setActiveTab("buffer")}
            className={`px-4 py-2 -mb-px border-b-2 ${activeTab === "buffer" ? "border-blue-600 text-blue-600" : "border-transparent"}`}
          >
            Buffer Visualizer
          </button>
          <button
            onClick={() => setActiveTab("metrics")}
            className={`px-4 py-2 -mb-px border-b-2 ${activeTab === "metrics" ? "border-blue-600 text-blue-600" : "border-transparent"}`}
          >
            Metrics Panel
          </button>
        </div>

        {activeTab === "events" && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap items-center">
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="p-2 border border-zinc-300 rounded-md dark:bg-zinc-800 dark:border-zinc-600"
              >
                {ALL_CHANNELS.map(ch => (
                  <option key={ch} value={ch}>
                    {ch === "all" ? "All Channels" : ch}
                  </option>
                ))}
              </select>
              <button
                onClick={clearEvents}
                className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Clear Log
              </button>
              <span className="text-sm text-zinc-500 ml-auto">
                {filteredEvents.length} events
              </span>
            </div>
            
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-md max-h-64 overflow-auto">
              {filteredEvents.length === 0 ? (
                <p className="p-3 text-zinc-500 text-sm">No events yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Time</th>
                      <th className="p-2 text-left">Channel</th>
                      <th className="p-2 text-left">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((evt) => (
                      <tr key={evt.id} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="p-2 text-xs text-zinc-500 font-mono">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-2 font-mono text-xs">{evt.channel}</td>
                        <td className="p-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                          {JSON.stringify(evt.data).slice(0, 40)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === "buffer" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buffer Strategy</label>
                <select
                  value={bufferStrategy}
                  onChange={(e) => updateBufferConfig(e.target.value as BufferStrategy, bufferSize)}
                  className="w-full p-2 border border-zinc-300 rounded-md dark:bg-zinc-800 dark:border-zinc-600"
                >
                  <option value="lru">LRU</option>
                  <option value="fifo">FIFO</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Size</label>
                <input
                  type="number"
                  value={bufferSize}
                  onChange={(e) => updateBufferConfig(bufferStrategy, Number(e.target.value))}
                  className="w-full p-2 border border-zinc-300 rounded-md dark:bg-zinc-800 dark:border-zinc-600"
                  min={1}
                  max={1000}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">TTL (ms, 0=disabled)</label>
                <input
                  type="number"
                  value={ttl}
                  onChange={(e) => setTtl(Number(e.target.value))}
                  className="w-full p-2 border border-zinc-300 rounded-md dark:bg-zinc-800 dark:border-zinc-600"
                  min={0}
                  step={1000}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => emitTestEvent(testChannel)}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Emit Event
              </button>
              <button
                onClick={() => {
                  for (let i = 0; i < 5; i++) {
                    setTimeout(() => emitTestEvent(testChannel), i * 100);
                  }
                }}
                className="px-3 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600"
              >
                Emit 5 Events
              </button>
              <button
                onClick={clearBuffer}
                className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Clear Buffer
              </button>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-700 rounded-md max-h-48 overflow-auto">
              {bufferedEvents.length === 0 ? (
                <p className="p-3 text-zinc-500 text-sm">Buffer empty</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Data</th>
                      <th className="p-2 text-left">TTL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bufferedEvents.map((evt, i) => (
                      <tr key={evt.id || i} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="p-2 text-xs">{i + 1}</td>
                        <td className="p-2 font-mono text-xs">{JSON.stringify(evt.data).slice(0, 40)}</td>
                        <td className="p-2 text-xs text-zinc-500">
                          {evt.ttlRemaining !== undefined 
                            ? `${Math.ceil(evt.ttlRemaining / 1000)}s` 
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === "metrics" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-md p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{metrics.eventsPerSecond.toFixed(1)}</div>
                <div className="text-sm text-zinc-500">Events / Second</div>
              </div>
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-md p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{metrics.activeSubscriptions}</div>
                <div className="text-sm text-zinc-500">Active Subscriptions</div>
              </div>
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-md p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{metrics.bufferUtilization.toFixed(1)}%</div>
                <div className="text-sm text-zinc-500">Buffer Utilization</div>
              </div>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-700 rounded-md p-4">
              <h3 className="font-medium mb-3">Controls</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buffer Strategy</label>
                  <select
                    value={bufferStrategy}
                    onChange={(e) => updateBufferConfig(e.target.value as BufferStrategy, bufferSize)}
                    className="w-full p-2 border border-zinc-300 rounded-md dark:bg-zinc-800 dark:border-zinc-600"
                  >
                    <option value="lru">LRU</option>
                    <option value="fifo">FIFO</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buffer Size</label>
                  <input
                    type="number"
                    value={bufferSize}
                    onChange={(e) => updateBufferConfig(bufferStrategy, Number(e.target.value))}
                    className="w-full p-2 border border-zinc-300 rounded-md dark:bg-zinc-800 dark:border-zinc-600"
                    min={1}
                    max={1000}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Security Features</label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={securityEnabled}
                      onChange={(e) => setSecurityEnabled(e.target.checked)}
                      id="security-toggle"
                    />
                    <label htmlFor="security-toggle" className="text-sm">Enabled</label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quick Emit</label>
                  <button
                    onClick={() => emitTestEvent(testChannel)}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Test Event
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}