"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  EventEmitter,
  createEventEmitter,
  type EventEmitterConfig,
  type EventCallback,
  type BaseEvent,
  type UnsubscribeFunction,
  type PerformanceMetrics,
} from "the-base-event";

interface EventContextValue {
  emitter: EventEmitter;
  isReady: boolean;
  subscribe: <T = unknown>(channel: string, callback: EventCallback<T>) => UnsubscribeFunction;
  publish: <T = unknown>(channel: string, data: T) => void;
  getBuffered: <T = unknown>(channel: string) => BaseEvent<T>[];
  getMetrics: () => PerformanceMetrics;
  clear: (channel?: string) => void;
  destroy: () => void;
  updateConfig: (config: Partial<EventEmitterConfig>) => void;
}

const EventContext = createContext<EventContextValue | null>(null);

interface EventProviderProps {
  children: React.ReactNode;
  config?: EventEmitterConfig;
}

export function EventProvider({ children, config }: EventProviderProps) {
  const emitterRef = useRef<EventEmitter | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    emitterRef.current = createEventEmitter(config);

    const timeoutId = setTimeout(() => {
      setIsReady(true);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      if (emitterRef.current) {
        emitterRef.current.destroy();
        emitterRef.current = null;
      }
    };
  }, [config]);

  const subscribe = useCallback(<T = unknown>(
    channel: string,
    callback: EventCallback<T>
  ): UnsubscribeFunction => {
    if (!emitterRef.current) {
      return () => {};
    }
    return emitterRef.current.on<T>(channel, callback);
  }, []);

  const publish = useCallback(<T = unknown>(channel: string, data: T) => {
    if (emitterRef.current) {
      emitterRef.current.emit(channel, data);
    }
  }, []);

  const getBuffered = useCallback(<T = unknown>(channel: string): BaseEvent<T>[] => {
    if (!emitterRef.current) {
      return [];
    }
    return emitterRef.current.getBuffered(channel) as BaseEvent<T>[];
  }, []);

  const getMetrics = useCallback((): PerformanceMetrics => {
    if (!emitterRef.current) {
      return {
        eventsPerSecond: 0,
        bufferUtilization: 0,
        memoryUsage: 0,
        activeSubscriptions: 0,
        middlewareLatency: 0,
      };
    }
    return emitterRef.current.getMetrics();
  }, []);

  const clear = useCallback((channel?: string) => {
    if (emitterRef.current) {
      emitterRef.current.clear(channel);
    }
  }, []);

  const destroy = useCallback(() => {
    if (emitterRef.current) {
      emitterRef.current.destroy();
      emitterRef.current = null;
    }
  }, []);

  const updateConfig = useCallback((config: Partial<EventEmitterConfig>) => {
    if (emitterRef.current) {
      (emitterRef.current as any).updateConfig?.(config);
    }
  }, []);

  const value: EventContextValue = {
    emitter: null as unknown as EventEmitter,
    isReady,
    subscribe,
    publish,
    getBuffered,
    getMetrics,
    clear,
    destroy,
    updateConfig,
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}

export function useEventContext(): EventContextValue {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEventContext must be used within an EventProvider");
  }
  return context;
}

export function useSubscribe<T = unknown>(
  channel: string,
  callback: EventCallback<T>
) {
  const { subscribe, isReady } = useEventContext();

  useEffect(() => {
    if (!isReady) return;
    const unsubscribe = subscribe<T>(channel, callback);
    return () => unsubscribe();
  }, [channel, callback, subscribe, isReady]);
}

export function usePublish() {
  const { publish, isReady } = useEventContext();
  return { publish, isReady };
}
