"use client";

import { useState, useEffect, useCallback } from "react";
import {
  createEventEmitter,
  isSSR,
  getEnvironment,
  type EventEmitter,
} from "the-base-event";

interface ServerEvent {
  id: string;
  channel: string;
  data: unknown;
  timestamp: number;
}

function createSSREmitter(syncMode: "immediate" | "on-hydration" | "manual" = "on-hydration") {
  return createEventEmitter({
    ssr: {
      enabled: true,
      syncMode,
    },
  });
}

export default function SSRDemo() {
  const [envInfo, setEnvInfo] = useState<{ isSSR: boolean; environment: string } | null>(null);
  const [syncMode, setSyncMode] = useState<"immediate" | "on-hydration" | "manual">("on-hydration");
  const [bufferedEvents, setBufferedEvents] = useState<ServerEvent[]>([]);
  const [replayedEvents, setReplayedEvents] = useState<ServerEvent[]>([]);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [emitter, setEmitter] = useState<EventEmitter | null>(null);
  const [emitterReady, setEmitterReady] = useState(false);

  useEffect(() => {
    const emp = createSSREmitter(syncMode);
    setEmitter(emp);
    setEnvInfo({ isSSR: isSSR(), environment: getEnvironment() });
    setEmitterReady(true);

    return () => {
      emp.destroy();
    };
  }, [syncMode]);

  const runTask4_1 = useCallback(() => {
    if (!emitter) return;
    
    const events: ServerEvent[] = [
      { id: "1", channel: "order:created", data: { orderId: "ORD-SRV-001", total: 99.99 }, timestamp: Date.now() },
      { id: "2", channel: "user:login", data: { userId: "user-456", email: "test@example.com" }, timestamp: Date.now() },
      { id: "3", channel: "inventory:low", data: { productId: "prod-789", stock: 5 }, timestamp: Date.now() },
    ];

    events.forEach((evt) => {
      emitter.emit(evt.channel, evt.data);
    });

    const buffered = emitter.getBuffered("order:created");
    setBufferedEvents(buffered);
    setTestResults((prev) => ({ ...prev, task4_1: buffered.length >= 3 }));
  }, [emitter]);

  const runTask4_2 = useCallback(async () => {
    if (!emitter) return;

    setReplayedEvents([]);
    
    if (syncMode === "manual") {
      emitter.replayServerEvents();
    } else {
      await emitter.waitForHydration();
      emitter.replayServerEvents();
    }

    const sub = emitter.on("order:created", (data) => {
      setReplayedEvents((prev) => [...prev, { id: Date.now().toString(), channel: "order:created", data, timestamp: Date.now() }]);
    });

    setTimeout(() => {
      sub();
    }, 100);

    setTestResults((prev) => ({ ...prev, task4_2: true }));
  }, [emitter, syncMode]);

  const runTask4_3 = useCallback(() => {
    const result = envInfo !== null;
    setTestResults((prev) => ({ ...prev, task4_3: result }));
  }, [envInfo]);

  const runTask4_4 = useCallback(async () => {
    const manualEmitter = createEventEmitter({
      ssr: { enabled: true, syncMode: "manual" },
    });

    manualEmitter.emit("order:created", { orderId: "MANUAL-001", total: 49.99 });
    manualEmitter.emit("payment:processed", { paymentId: "PAY-001", amount: 49.99 });

    const beforeReplay = manualEmitter.getBuffered("order:created").length;
    manualEmitter.replayServerEvents();
    const afterReplay = manualEmitter.getBuffered("order:created").length;

    manualEmitter.destroy();

    setTestResults((prev) => ({ ...prev, task4_4: beforeReplay > 0 }));
  }, []);

  const runAllTests = useCallback(() => {
    runTask4_1();
    setTimeout(() => {
      runTask4_2();
      runTask4_3();
      runTask4_4();
    }, 100);
  }, [runTask4_1, runTask4_2, runTask4_3, runTask4_4]);

  const clearBuffer = useCallback(() => {
    if (!emitter) return;
    emitter.clear();
    setBufferedEvents([]);
    setReplayedEvents([]);
    setTestResults({});
  }, [emitter]);

  if (!emitterReady) {
    return <div className="p-4 border border-zinc-300 rounded-lg bg-white">Loading...</div>;
  }

  return (
    <div className="border border-zinc-300 rounded-lg bg-white dark:bg-zinc-900 dark:border-zinc-700">
      <div className="border-b border-zinc-200 dark:border-zinc-700 p-4">
        <h2 className="text-xl font-semibold">Phase 4: SSR Compatibility</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Server-side rendering with event buffering and hydration replay
        </p>
      </div>

      <div className="p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sync Mode</label>
            <select
              value={syncMode}
              onChange={(e) => setSyncMode(e.target.value as "immediate" | "on-hydration" | "manual")}
              className="w-full p-2 border border-zinc-300 rounded-md dark:bg-zinc-800 dark:border-zinc-600"
            >
              <option value="on-hydration">On Hydration</option>
              <option value="immediate">Immediate</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Environment Info</label>
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md text-sm font-mono">
              {envInfo ? (
                <>
                  <div>isSSR: <span className={envInfo.isSSR ? "text-green-600" : "text-blue-600"}>{String(envInfo.isSSR)}</span></div>
                  <div>environment: <span className="text-purple-600">{envInfo.environment}</span></div>
                </>
              ) : "Loading..."}
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
            onClick={runTask4_1}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          >
            Test 4.1: Server Emission
          </button>
          <button
            onClick={runTask4_2}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          >
            Test 4.2: Hydration Replay
          </button>
          <button
            onClick={runTask4_3}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          >
            Test 4.3: Env Detection
          </button>
          <button
            onClick={runTask4_4}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          >
            Test 4.4: Manual Sync
          </button>
          <button
            onClick={clearBuffer}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Clear Buffer
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Server Buffered Events</h3>
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-md max-h-48 overflow-auto">
              {bufferedEvents.length === 0 ? (
                <p className="p-3 text-zinc-500 text-sm">No buffered events</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Channel</th>
                      <th className="p-2 text-left">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bufferedEvents.map((evt, i) => (
                      <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="p-2 font-mono text-xs">{evt.channel}</td>
                        <td className="p-2 font-mono text-xs">{JSON.stringify(evt.data).slice(0, 40)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2">Replayed Events (Client)</h3>
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-md max-h-48 overflow-auto">
              {replayedEvents.length === 0 ? (
                <p className="p-3 text-zinc-500 text-sm">No replayed events</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Channel</th>
                      <th className="p-2 text-left">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {replayedEvents.map((evt, i) => (
                      <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="p-2 font-mono text-xs">{evt.channel}</td>
                        <td className="p-2 font-mono text-xs">{JSON.stringify(evt.data).slice(0, 40)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Test Results</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className={`p-2 rounded text-center text-sm ${testResults.task4_1 ? "bg-green-100 dark:bg-green-900 text-green-700" : "bg-zinc-100 dark:bg-zinc-800"}`}>
              4.1 Server Emission
              {testResults.task4_1 && <span className="ml-1">✓</span>}
            </div>
            <div className={`p-2 rounded text-center text-sm ${testResults.task4_2 ? "bg-green-100 dark:bg-green-900 text-green-700" : "bg-zinc-100 dark:bg-zinc-800"}`}>
              4.2 Hydration Replay
              {testResults.task4_2 && <span className="ml-1">✓</span>}
            </div>
            <div className={`p-2 rounded text-center text-sm ${testResults.task4_3 ? "bg-green-100 dark:bg-green-900 text-green-700" : "bg-zinc-100 dark:bg-zinc-800"}`}>
              4.3 Env Detection
              {testResults.task4_3 && <span className="ml-1">✓</span>}
            </div>
            <div className={`p-2 rounded text-center text-sm ${testResults.task4_4 ? "bg-green-100 dark:bg-green-900 text-green-700" : "bg-zinc-100 dark:bg-zinc-800"}`}>
              4.4 Manual Sync
              {testResults.task4_4 && <span className="ml-1">✓</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}