"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useEventContext } from "./EventProvider";
import { ecommerceEvents, type OrderEvent, type PaymentEvent, type UserEvent } from "@/lib/emitter";

interface EventLog {
  id: string;
  channel: string;
  data: unknown;
  timestamp: number;
}

interface PerformanceResult {
  totalEvents: number;
  duration: number;
  eventsPerSecond: number;
}

const CHANNELS = [
  ecommerceEvents.ORDER_CREATED,
  ecommerceEvents.ORDER_UPDATED,
  ecommerceEvents.PAYMENT_PROCESSED,
  ecommerceEvents.PAYMENT_FAILED,
  ecommerceEvents.USER_LOGIN,
  ecommerceEvents.USER_LOGOUT,
];

export default function EventTestPanel() {
  const { subscribe, publish, isReady, getMetrics, clear } = useEventContext();
  const [events, setEvents] = useState<EventLog[]>([]);
  const [metrics, setMetrics] = useState({ eventsPerSecond: 0, bufferUtilization: 0, activeSubscriptions: 0 });
  
  const [isSubscribed, setIsSubscribed] = useState(true);
  const [performanceResult, setPerformanceResult] = useState<PerformanceResult | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isReady) return;

    if (isSubscribed) {
      const unsubscribers = CHANNELS.map((channel) => {
        return subscribe(channel, (event) => {
          setEvents((prev) => {
            const newEvent = {
              id: event.id,
              channel: event.channel,
              data: event.data,
              timestamp: event.timestamp,
            };
            return [newEvent, ...prev].slice(0, 50);
          });
        });
      });
      
      unsubscribeRef.current = () => {
        unsubscribers.forEach((unsub) => unsub());
      };
    } else {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [isReady, subscribe, isSubscribed]);

  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      setMetrics(getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, [isReady, getMetrics]);

  const emitOrder = useCallback(() => {
    const order: OrderEvent = {
      orderId: `ORD-${Date.now()}`,
      userId: "user-123",
      total: Math.random() * 100 + 10,
      items: [
        { productId: "prod-1", quantity: Math.floor(Math.random() * 5) + 1, price: 29.99 },
      ],
      timestamp: Date.now(),
    };
    publish(ecommerceEvents.ORDER_CREATED, order);
  }, [publish]);

  const emitPayment = useCallback(() => {
    const payment: PaymentEvent = {
      orderId: `ORD-${Date.now()}`,
      userId: "user-123",
      amount: Math.random() * 200 + 50,
      method: Math.random() > 0.5 ? "credit_card" : "paypal",
      status: Math.random() > 0.2 ? "success" : "failed",
      timestamp: Date.now(),
    };
    publish(
      payment.status === "success"
        ? ecommerceEvents.PAYMENT_PROCESSED
        : ecommerceEvents.PAYMENT_FAILED,
      payment
    );
  }, [publish]);

  const emitUserLogin = useCallback(() => {
    const user: UserEvent = {
      userId: `user-${Math.floor(Math.random() * 1000)}`,
      email: `user${Math.floor(Math.random() * 1000)}@example.com`,
      name: `Test User ${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
    };
    publish(ecommerceEvents.USER_LOGIN, user);
  }, [publish]);

  const emitUserLogout = useCallback(() => {
    const user: UserEvent = {
      userId: "user-123",
      email: "user@example.com",
      name: "Test User",
      timestamp: Date.now(),
    };
    publish(ecommerceEvents.USER_LOGOUT, user);
  }, [publish]);

  const handleClear = useCallback(() => {
    clear();
    setEvents([]);
    setPerformanceResult(null);
  }, [clear]);

  const toggleSubscription = useCallback(() => {
    setIsSubscribed((prev) => !prev);
  }, []);

  const runPerformanceTest = useCallback(async (eventCount: number = 1000) => {
    if (isRunningTest) return;
    
    setIsRunningTest(true);
    setPerformanceResult(null);
    setEvents([]);
    
    const startTime = performance.now();
    let eventsEmitted = 0;
    
    const emitLoop = () => {
      return new Promise<void>((resolve) => {
        const emitEvents = () => {
          for (let i = 0; i < 100; i++) {
            if (eventsEmitted >= eventCount) {
              const endTime = performance.now();
              const duration = endTime - startTime;
              const eps = (eventsEmitted / duration) * 1000;
              setPerformanceResult({
                totalEvents: eventsEmitted,
                duration: duration,
                eventsPerSecond: eps,
              });
              setIsRunningTest(false);
              resolve();
              return;
            }
            
            const order: OrderEvent = {
              orderId: `PERF-${eventsEmitted}`,
              userId: "perf-user",
              total: 10,
              items: [{ productId: "perf-prod", quantity: 1, price: 10 }],
              timestamp: Date.now(),
            };
            publish(ecommerceEvents.ORDER_CREATED, order);
            eventsEmitted++;
          }
          
          setTimeout(emitEvents, 0);
        };
        
        emitEvents();
      });
    };
    
    await emitLoop();
  }, [publish, isRunningTest]);

  if (!isReady) {
    return <div className="p-4">Loading event system...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">Event Emitter Test Panel</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-4">
            <h3 className="font-medium mb-2">Emit Events</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={emitOrder}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Emit Order
              </button>
              <button
                onClick={emitPayment}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Emit Payment
              </button>
              <button
                onClick={emitUserLogin}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              >
                User Login
              </button>
              <button
                onClick={emitUserLogout}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
              >
                User Logout
              </button>
            </div>
          </div>

          <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-4">
            <h3 className="font-medium mb-2">Metrics</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-zinc-500">Events/sec:</span>
                <span className="ml-2 font-mono">{metrics.eventsPerSecond.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-zinc-500">Buffer %:</span>
                <span className="ml-2 font-mono">{(metrics.bufferUtilization * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-zinc-500">Subscribers:</span>
                <span className="ml-2 font-mono">{metrics.activeSubscriptions}</span>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="mt-3 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
            >
              Clear All Events
            </button>
          </div>

          <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-4">
            <h3 className="font-medium mb-2">Subscription Control</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={toggleSubscription}
                className={`px-4 py-2 rounded transition-colors ${
                  isSubscribed 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-gray-500 hover:bg-gray-600"
                } text-white`}
              >
                {isSubscribed ? "Unsubscribe All" : "Subscribe All"}
              </button>
              <p className="text-xs text-zinc-500">
                Status: {isSubscribed ? "Active" : "Unsubscribed"}
              </p>
              <p className="text-xs text-zinc-400">
                Try emitting events when unsubscribed - no events should appear in log
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-4">
            <h3 className="font-medium mb-2">Performance Test</h3>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => runPerformanceTest(1000)}
                disabled={isRunningTest}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunningTest ? "Running Test..." : "Run Performance Test (1000 events)"}
              </button>
              <button
                onClick={() => runPerformanceTest(5000)}
                disabled={isRunningTest}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunningTest ? "Running Test..." : "Run Performance Test (5000 events)"}
              </button>
              {performanceResult && (
                <div className="mt-2 p-3 bg-zinc-200 dark:bg-zinc-700 rounded">
                  <h4 className="font-medium text-sm mb-1">Results:</h4>
                  <p className="text-sm font-mono">
                    Total: {performanceResult.totalEvents} events
                  </p>
                  <p className="text-sm font-mono">
                    Duration: {performanceResult.duration.toFixed(2)}ms
                  </p>
                  <p className="text-sm font-mono text-green-600 font-bold">
                    Throughput: {performanceResult.eventsPerSecond.toFixed(0)} events/sec
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-4">
            <h3 className="font-medium mb-2">Subscribed Channels:</h3>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((channel: string) => (
                <span
                  key={channel}
                  className={`px-2 py-1 rounded text-xs font-mono ${
                    isSubscribed 
                      ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200"
                      : "bg-zinc-300 dark:bg-zinc-600 text-zinc-500"
                  }`}
                >
                  {channel}
                </span>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              {isSubscribed 
                ? "All channels are subscribed - events will be received"
                : "All channels unsubscribed - emit buttons won't trigger log updates"}
            </p>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">
            Event Log ({events.length} events)
          </h3>
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <p className="p-4 text-zinc-500 text-center">
                No events received yet. Click an emit button above.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-zinc-100 dark:bg-zinc-700 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Channel</th>
                    <th className="px-3 py-2 text-left font-medium">Data</th>
                    <th className="px-3 py-2 text-left font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr
                      key={event.id}
                      className="border-t border-zinc-200 dark:border-zinc-700"
                    >
                      <td className="px-3 py-2 font-mono text-xs">
                        {event.channel}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {JSON.stringify(event.data).slice(0, 50)}...
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
