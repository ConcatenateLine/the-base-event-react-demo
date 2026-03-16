"use client";

import { useState, useEffect, useCallback } from "react";
import {
  createEventEmitter,
  createSchemaMiddleware,
  type EventEmitter,
  type Middleware,
  type Schema,
  type ValidationError,
  type ValidationResult,
} from "the-base-event";

const orderSchema: Schema = {
  type: "object",
  properties: {
    orderId: { type: "string" },
    userId: { type: "string" },
    total: { type: "number" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          productId: { type: "string" },
          quantity: { type: "number" },
          price: { type: "number" },
        },
        required: ["productId", "quantity", "price"],
      },
    },
    timestamp: { type: "number" },
  },
  required: ["orderId", "userId", "total", "items", "timestamp"],
};

const paymentSchema: Schema = {
  type: "object",
  properties: {
    orderId: { type: "string" },
    userId: { type: "string" },
    amount: { type: "number" },
    method: { 
      type: "enum", 
      values: ["credit_card", "paypal", "bank_transfer"] as const
    },
    status: {
      type: "enum",
      values: ["success", "failed", "pending"] as const,
    },
    timestamp: { type: "number" },
  },
  required: ["orderId", "userId", "amount", "method", "status", "timestamp"],
};

function validateData(data: unknown, schema: Schema): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (schema.type === "object" && typeof data === "object" && data !== null) {
    const objData = data as Record<string, unknown>;
    const props = schema.properties as Record<string, Schema> | undefined;
    const required = schema.required as string[] | undefined;
    
    if (required) {
      for (const key of required) {
        if (!(key in objData)) {
          errors.push({ path: key, message: `Missing required field: ${key}`, value: undefined, rule: schema });
        }
      }
    }
    
    if (props) {
      for (const [key, propSchema] of Object.entries(props)) {
        if (key in objData) {
          const value = objData[key];
          const propResult = validateData(value, propSchema);
          if (propResult.errors.length > 0) {
            errors.push(...propResult.errors.map(e => ({ ...e, path: `${key}.${e.path}` })));
          }
        }
      }
    }
  }
  
  if (schema.type === "string" && typeof data !== "string") {
    errors.push({ path: "", message: `Expected string, got ${typeof data}`, value: data, rule: schema });
  }
  
  if (schema.type === "number" && typeof data !== "number") {
    errors.push({ path: "", message: `Expected number, got ${typeof data}`, value: data, rule: schema });
  }
  
  if (schema.type === "array" && Array.isArray(data)) {
    const itemsSchema = (schema as any).items;
    if (itemsSchema) {
      data.forEach((item, idx) => {
        const itemResult = validateData(item, itemsSchema);
        if (itemResult.errors.length > 0) {
          errors.push(...itemResult.errors.map(e => ({ ...e, path: `[${idx}].${e.path}` })));
        }
      });
    }
  }
  
  if (schema.type === "enum" && schema.values) {
    if (!schema.values.includes(data as string)) {
      errors.push({ path: "", message: `Value must be one of: ${(schema.values as string[]).join(", ")}`, value: data, rule: schema });
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export default function ValidationDemo() {
  const [emitter, setEmitter] = useState<EventEmitter | null>(null);
  const [emitterReady, setEmitterReady] = useState(false);
  const [useMiddleware, setUseMiddleware] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [validationLogs, setValidationLogs] = useState<Array<{channel: string; valid: boolean; errors: ValidationError[]; data: unknown}>>([]);
  const [activeSchema, setActiveSchema] = useState<"order" | "payment">("order");

  useEffect(() => {
    const middlewares: Middleware[] = [];
    if (useMiddleware) {
      const schema = activeSchema === "order" ? orderSchema : paymentSchema;
      middlewares.push(createSchemaMiddleware(schema));
    }

    const emp = createEventEmitter({ middleware: middlewares });
    setEmitter(emp);
    setEmitterReady(true);

    return () => {
      emp.destroy();
    };
  }, [useMiddleware, activeSchema]);

  const runTask6_1 = useCallback(() => {
    const logs: typeof validationLogs = [];
    
    const validOrder = {
      orderId: "ORD-001",
      userId: "user-123",
      total: 99.99,
      items: [
        { productId: "prod-1", quantity: 2, price: 29.99 },
      ],
      timestamp: Date.now(),
    };
    
    const invalidOrder = {
      orderId: "ORD-002",
      total: 50.00,
    };

    const validResult = validateData(validOrder, orderSchema);
    const invalidResult = validateData(invalidOrder, orderSchema);
    
    logs.push({ channel: "order:created", valid: validResult.valid, errors: validResult.errors, data: validOrder });
    logs.push({ channel: "order:created", valid: invalidResult.valid, errors: invalidResult.errors, data: invalidOrder });
    
    setValidationLogs(logs);
    setTestResults((prev) => ({ ...prev, task6_1: validResult.valid && !invalidResult.valid }));
  }, []);

  const runTask6_2 = useCallback(() => {
    const logs: typeof validationLogs = [];
    
    const validPayment = {
      orderId: "ORD-003",
      userId: "user-123",
      amount: 150.00,
      method: "credit_card",
      status: "success",
      timestamp: Date.now(),
    };
    
    const invalidMethod = {
      orderId: "ORD-004",
      userId: "user-123",
      amount: 100.00,
      method: "crypto",
      status: "success",
      timestamp: Date.now(),
    };

    const validResult = validateData(validPayment, paymentSchema);
    const invalidResult = validateData(invalidMethod, paymentSchema);
    
    logs.push({ channel: "payment:processed", valid: validResult.valid, errors: validResult.errors, data: validPayment });
    logs.push({ channel: "payment:processed", valid: invalidResult.valid, errors: invalidResult.errors, data: invalidMethod });
    
    setValidationLogs(logs);
    setTestResults((prev) => ({ ...prev, task6_2: validResult.valid && !invalidResult.valid }));
  }, []);

  const runTask6_3 = useCallback(() => {
    if (!emitter) return;

    const schema = activeSchema === "order" ? orderSchema : paymentSchema;
    
    let passed = false;
    
    emitter.on("test:validate" as any, (data: any) => {
      const result = validateData(data, schema);
      passed = result.valid;
    });
    
    const validData = activeSchema === "order" 
      ? { orderId: "ORD-005", userId: "user-456", total: 100, items: [], timestamp: Date.now() }
      : { orderId: "ORD-005", userId: "user-456", amount: 100, method: "paypal", status: "success", timestamp: Date.now() };
    
    emitter.emit("test:validate" as any, validData);
    
    setTimeout(() => {
      setTestResults((prev) => ({ ...prev, task6_3: passed }));
    }, 50);
  }, [emitter, activeSchema]);

  const runAllTests = useCallback(() => {
    runTask6_1();
    setTimeout(() => {
      runTask6_2();
      runTask6_3();
    }, 100);
  }, [runTask6_1, runTask6_2, runTask6_3]);

  const clearLogs = useCallback(() => {
    setValidationLogs([]);
    setTestResults({});
  }, []);

  if (!emitterReady) {
    return <div className="p-4 border border-zinc-300 rounded-lg bg-white">Loading...</div>;
  }

  return (
    <div className="border border-zinc-300 rounded-lg bg-white dark:bg-zinc-900 dark:border-zinc-700">
      <div className="border-b border-zinc-200 dark:border-zinc-700 p-4">
        <h2 className="text-xl font-semibold">Phase 6: Schema Validation</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Validate event payloads with JSON Schema
        </p>
      </div>

      <div className="p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Active Schema</label>
            <select
              value={activeSchema}
              onChange={(e) => setActiveSchema(e.target.value as "order" | "payment")}
              className="w-full p-2 border border-zinc-300 rounded-md dark:bg-zinc-800 dark:border-zinc-600"
            >
              <option value="order">Order Schema</option>
              <option value="payment">Payment Schema</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Validation Mode</label>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={useMiddleware}
                onChange={(e) => setUseMiddleware(e.target.checked)}
                id="middleware-toggle"
              />
              <label htmlFor="middleware-toggle" className="text-sm">Use Validation Middleware</label>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Schema Definition</label>
            <pre className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs overflow-x-auto max-h-20">
              {activeSchema === "order" 
                ? "orderId, userId, total, items[], timestamp"
                : "orderId, userId, amount, method[enum], status[enum], timestamp"}
            </pre>
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
            onClick={runTask6_1}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          >
            Test 6.1: Order Validation
          </button>
          <button
            onClick={runTask6_2}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          >
            Test 6.2: Payment Validation
          </button>
          <button
            onClick={runTask6_3}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          >
            Test 6.3: Validation Middleware
          </button>
          <button
            onClick={clearLogs}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Clear Logs
          </button>
        </div>

        <div>
          <h3 className="font-medium mb-2">Validation Logs</h3>
          <div className="border border-zinc-200 dark:border-zinc-700 rounded-md max-h-64 overflow-auto">
            {validationLogs.length === 0 ? (
              <p className="p-3 text-zinc-500 text-sm">No validation logs yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Channel</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Errors</th>
                    <th className="p-2 text-left">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {validationLogs.map((log, i) => (
                    <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="p-2 font-mono text-xs">{log.channel}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${log.valid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {log.valid ? "Valid" : "Invalid"}
                        </span>
                      </td>
                      <td className="p-2 text-xs text-red-600 max-w-48">
                        {log.errors.length > 0 ? log.errors.map(e => e.message).join(", ") : "-"}
                      </td>
                      <td className="p-2 font-mono text-xs text-zinc-500">
                        {JSON.stringify(log.data).slice(0, 50)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Test Results</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-2 rounded text-center text-sm ${testResults.task6_1 ? "bg-green-100 dark:bg-green-900 text-green-700" : "bg-zinc-100 dark:bg-zinc-800"}`}>
              6.1 Order Validation
              {testResults.task6_1 && <span className="ml-1">✓</span>}
            </div>
            <div className={`p-2 rounded text-center text-sm ${testResults.task6_2 ? "bg-green-100 dark:bg-green-900 text-green-700" : "bg-zinc-100 dark:bg-zinc-800"}`}>
              6.2 Payment Validation
              {testResults.task6_2 && <span className="ml-1">✓</span>}
            </div>
            <div className={`p-2 rounded text-center text-sm ${testResults.task6_3 ? "bg-green-100 dark:bg-green-900 text-green-700" : "bg-zinc-100 dark:bg-zinc-800"}`}>
              6.3 Validation Middleware
              {testResults.task6_3 && <span className="ml-1">✓</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}