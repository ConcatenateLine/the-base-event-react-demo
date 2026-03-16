"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useEventContext } from "./EventProvider";
import { ecommerceEvents, type OrderEvent, type CartEvent, type UserEvent } from "@/lib/emitter";

interface OrderNotification {
  id: string;
  orderId: string;
  userId: string;
  total: number;
  status: "created" | "updated" | "cancelled";
  timestamp: number;
}

export function OrderNotifications() {
  const { subscribe, isReady } = useEventContext();
  const [orders, setOrders] = useState<OrderNotification[]>([]);
  const unsubscribeRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!isReady) return;

    const handleOrderCreated = (event: { channel: string; data: OrderEvent }) => {
      setOrders((prev) => [{
        id: event.data.orderId,
        orderId: event.data.orderId,
        userId: event.data.userId,
        total: event.data.total,
        status: "created" as const,
        timestamp: event.data.timestamp,
      }, ...prev].slice(0, 20));
    };

    const handleOrderUpdated = (event: { channel: string; data: OrderEvent }) => {
      setOrders((prev) => prev.map((o) =>
        o.orderId === event.data.orderId
          ? { ...o, total: event.data.total, status: "updated" as const, timestamp: event.data.timestamp }
          : o
      ));
    };

    const handleOrderCancelled = (event: { channel: string; data: OrderEvent }) => {
      setOrders((prev) => prev.map((o) =>
        o.orderId === event.data.orderId
          ? { ...o, status: "cancelled" as const, timestamp: event.data.timestamp }
          : o
      ));
    };

    unsubscribeRef.current = [
      subscribe(ecommerceEvents.ORDER_CREATED, handleOrderCreated),
      subscribe(ecommerceEvents.ORDER_UPDATED, handleOrderUpdated),
      subscribe(ecommerceEvents.ORDER_CANCELLED, handleOrderCancelled),
    ];

    return () => {
      unsubscribeRef.current.forEach((unsub) => unsub());
    };
  }, [isReady, subscribe]);

  const clearOrders = useCallback(() => {
    setOrders([]);
  }, []);

  if (!isReady) return null;

  return (
    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-lg">Order Notifications</h3>
        <button
          onClick={clearOrders}
          className="text-xs px-2 py-1 bg-zinc-300 dark:bg-zinc-600 rounded hover:bg-zinc-400 dark:hover:bg-zinc-500"
        >
          Clear
        </button>
      </div>
      {orders.length === 0 ? (
        <p className="text-zinc-500 text-sm">No orders yet</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`p-2 rounded text-sm ${
                order.status === "cancelled"
                  ? "bg-red-100 dark:bg-red-900/30"
                  : order.status === "updated"
                  ? "bg-yellow-100 dark:bg-yellow-900/30"
                  : "bg-green-100 dark:bg-green-900/30"
              }`}
            >
              <div className="flex justify-between">
                <span className="font-mono">{order.orderId}</span>
                <span className={`font-medium ${
                  order.status === "cancelled" ? "text-red-600" :
                  order.status === "updated" ? "text-yellow-600" : "text-green-600"
                }`}>
                  {order.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500 text-xs mt-1">
                <span>${order.total.toFixed(2)}</span>
                <span>{new Date(order.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface CartState {
  items: CartItem[];
  total: number;
}

export function CartUpdates() {
  const { subscribe, publish, isReady } = useEventContext();
  const [cart, setCart] = useState<CartState>({ items: [], total: 0 });
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isReady) return;

    const handleCartUpdated = (event: { channel: string; data: CartEvent }) => {
      const cartEvent = event.data;
      setCart((prev) => {
        const existingIndex = prev.items.findIndex(
          (item) => item.productId === cartEvent.productId
        );

        let newItems: CartItem[];

        if (cartEvent.action === "remove") {
          newItems = prev.items.filter((item) => item.productId !== cartEvent.productId);
        } else if (existingIndex >= 0) {
          newItems = [...prev.items];
          if (cartEvent.action === "update") {
            newItems[existingIndex].quantity = cartEvent.quantity;
          } else {
            newItems[existingIndex].quantity += cartEvent.quantity;
          }
        } else {
          newItems = [
            ...prev.items,
            {
              productId: cartEvent.productId,
              productName: `Product ${cartEvent.productId}`,
              quantity: cartEvent.quantity,
              price: 29.99,
            },
          ];
        }

        return {
          items: newItems,
          total: newItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        };
      });
    };

    unsubscribeRef.current = subscribe(ecommerceEvents.CART_UPDATED, handleCartUpdated);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [isReady, subscribe]);

  const addToCart = useCallback((productId: string) => {
    const cartEvent: CartEvent = {
      userId: "user-123",
      productId,
      quantity: 1,
      action: "add",
      timestamp: Date.now(),
    };
    publish(ecommerceEvents.CART_UPDATED, cartEvent);
  }, [publish]);

  const removeFromCart = useCallback((productId: string) => {
    const cartEvent: CartEvent = {
      userId: "user-123",
      productId,
      quantity: 0,
      action: "remove",
      timestamp: Date.now(),
    };
    publish(ecommerceEvents.CART_UPDATED, cartEvent);
  }, [publish]);

  const clearCart = useCallback(() => {
    setCart({ items: [], total: 0 });
  }, []);

  if (!isReady) return null;

  return (
    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-lg">Live Cart Updates</h3>
        <button
          onClick={clearCart}
          className="text-xs px-2 py-1 bg-zinc-300 dark:bg-zinc-600 rounded hover:bg-zinc-400 dark:hover:bg-zinc-500"
        >
          Clear
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        {["prod-1", "prod-2", "prod-3", "prod-4", "prod-5"].map((prodId) => (
          <button
            key={prodId}
            onClick={() => addToCart(prodId)}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + {prodId}
          </button>
        ))}
      </div>

      {cart.items.length === 0 ? (
        <p className="text-zinc-500 text-sm">Cart is empty</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {cart.items.map((item) => (
            <div key={item.productId} className="flex justify-between items-center p-2 bg-white dark:bg-zinc-700 rounded">
              <div>
                <span className="font-mono text-sm">{item.productName}</span>
                <span className="text-zinc-500 text-xs ml-2">x{item.quantity}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 border-t border-zinc-300 dark:border-zinc-600">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-lg">${cart.total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface UserActivity {
  userId: string;
  email: string;
  name: string;
  action: "login" | "logout";
  timestamp: number;
}

export function UserActivityFeed() {
  const { subscribe, publish, isReady } = useEventContext();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const unsubscribeRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!isReady) return;

    const handleUserLogin = (event: { channel: string; data: UserEvent }) => {
      setActivities((prev) => [{
        userId: event.data.userId,
        email: event.data.email,
        name: event.data.name,
        action: "login" as const,
        timestamp: event.data.timestamp,
      }, ...prev].slice(0, 30));
    };

    const handleUserLogout = (event: { channel: string; data: UserEvent }) => {
      setActivities((prev) => [{
        userId: event.data.userId,
        email: event.data.email,
        name: event.data.name,
        action: "logout" as const,
        timestamp: event.data.timestamp,
      }, ...prev].slice(0, 30));
    };

    unsubscribeRef.current = [
      subscribe(ecommerceEvents.USER_LOGIN, handleUserLogin),
      subscribe(ecommerceEvents.USER_LOGOUT, handleUserLogout),
    ];

    return () => {
      unsubscribeRef.current.forEach((unsub) => unsub());
    };
  }, [isReady, subscribe]);

  const emitLogin = useCallback(() => {
    const user: UserEvent = {
      userId: `user-${Math.floor(Math.random() * 100)}`,
      email: `user${Math.floor(Math.random() * 100)}@example.com`,
      name: `User ${Math.floor(Math.random() * 100)}`,
      timestamp: Date.now(),
    };
    publish(ecommerceEvents.USER_LOGIN, user);
  }, [publish]);

  const emitLogout = useCallback(() => {
    const user: UserEvent = {
      userId: "user-123",
      email: "user@example.com",
      name: "Test User",
      timestamp: Date.now(),
    };
    publish(ecommerceEvents.USER_LOGOUT, user);
  }, [publish]);

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  if (!isReady) return null;

  return (
    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-lg">User Activity Feed</h3>
        <button
          onClick={clearActivities}
          className="text-xs px-2 py-1 bg-zinc-300 dark:bg-zinc-600 rounded hover:bg-zinc-400 dark:hover:bg-zinc-500"
        >
          Clear
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={emitLogin}
          className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Simulate Login
        </button>
        <button
          onClick={emitLogout}
          className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          Simulate Logout
        </button>
      </div>

      {activities.length === 0 ? (
        <p className="text-zinc-500 text-sm">No user activity yet</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {activities.map((activity, idx) => (
            <div
              key={`${activity.userId}-${activity.timestamp}-${idx}`}
              className={`p-2 rounded text-sm ${
                activity.action === "login"
                  ? "bg-purple-100 dark:bg-purple-900/30"
                  : "bg-orange-100 dark:bg-orange-900/30"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{activity.name}</span>
                <span className={`text-xs font-medium ${
                  activity.action === "login" ? "text-purple-600" : "text-orange-600"
                }`}>
                  {activity.action.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500 text-xs mt-1">
                <span className="font-mono">{activity.email}</span>
                <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReactIntegrationDemo() {
  return (
    <div className="space-y-6 p-6">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">React Integration Demo</h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Real-time UI updates using React hooks with automatic cleanup on unmount
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <OrderNotifications />
          <CartUpdates />
          <UserActivityFeed />
        </div>
      </div>
    </div>
  );
}
