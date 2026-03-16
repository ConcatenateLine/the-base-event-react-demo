"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { 
  EventEmitter, 
  createEventEmitter,
  type EventEmitterConfig,
  type EventCallback,
  type BaseEvent,
  type UnsubscribeFunction
} from "the-base-event";

const globalEmitter: { current: EventEmitter | null } = { current: null };

const getGlobalEmitter = (config?: EventEmitterConfig) => {
  if (!globalEmitter.current) {
    globalEmitter.current = createEventEmitter(config);
  }
  return globalEmitter.current;
};

export interface UseBaseEventOptions {
  replayBuffered?: boolean;
}

export function useBaseEvent<T = unknown>(
  channel: string,
  callback: EventCallback<T>,
  options: UseBaseEventOptions = {}
) {
  const { replayBuffered = true } = options;
  const callbackRef = useRef(callback);
  const isMountedRef = useRef(true);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const emitter = getGlobalEmitter();
    const handler: EventCallback<T> = (event: BaseEvent<T>) => {
      if (isMountedRef.current) {
        callbackRef.current(event);
      }
    };

    const unsubscribe = emitter.on<T>(channel, handler);

    if (replayBuffered) {
      const buffered = emitter.getBuffered(channel);
      buffered.forEach((event) => {
        if (isMountedRef.current) {
          callbackRef.current(event as BaseEvent<T>);
        }
      });
    }

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [channel, replayBuffered]);

  return { isReady: true };
}

export function useEmit() {
  const emitterRef = useRef<EventEmitter | null>(null);

  useEffect(() => {
    emitterRef.current = getGlobalEmitter();
  }, []);

  const emit = useCallback(<T = unknown>(channel: string, data: T) => {
    if (emitterRef.current) {
      emitterRef.current.emit(channel, data);
    }
  }, []);

  return { emit };
}

export function useEventEmitter(config?: EventEmitterConfig) {
  const [emitter] = useState(() => createEventEmitter(config));

  useEffect(() => {
    return () => {
      emitter.destroy();
    };
  }, [emitter]);

  const subscribe = useCallback(<T = unknown>(
    channel: string, 
    callback: EventCallback<T>
  ): UnsubscribeFunction => {
    return emitter.on<T>(channel, callback);
  }, [emitter]);

  const publish = useCallback(<T = unknown>(channel: string, data: T) => {
    emitter.emit(channel, data);
  }, [emitter]);

  const getBuffered = useCallback(<T = unknown>(channel: string) => {
    return emitter.getBuffered(channel) as BaseEvent<T>[];
  }, [emitter]);

  const getMetrics = useCallback(() => {
    return emitter.getMetrics();
  }, [emitter]);

  return {
    emitter,
    subscribe,
    publish,
    getBuffered,
    getMetrics,
    isSSR: emitter.isSSR(),
  };
}

export function useEventChannel<T = unknown>(channel: string) {
  const [events, setEvents] = useState<BaseEvent<T>[]>([]);
  const [lastEvent, setLastEvent] = useState<BaseEvent<T> | null>(null);

  useEffect(() => {
    const emitter = getGlobalEmitter();
    
    const unsubscribe = emitter.on<T>(channel, (event) => {
      setLastEvent(event);
      setEvents(prev => [...prev, event]);
    });

    return () => {
      unsubscribe();
    };
  }, [channel]);

  const clear = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  return {
    events,
    lastEvent,
    clear,
    count: events.length,
  };
}

export { getGlobalEmitter };
export type { EventEmitterConfig, EventCallback, BaseEvent, UnsubscribeFunction };
