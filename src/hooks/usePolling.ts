import { useEffect, useRef, useCallback } from "react";

export interface PollingOptions {
  interval?: number; // in milliseconds
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export function usePolling(
  callback: () => Promise<void> | void,
  options: PollingOptions = {}
) {
  const { interval = 30000, enabled = true, onError } = options;
  const savedCallback = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const tick = async () => {
      try {
        await savedCallback.current();
      } catch (error) {
        if (onError) {
          onError(error as Error);
        } else {
          console.error("Polling error:", error);
        }
      }
    };

    // Execute immediately
    tick();

    // Then set up interval
    intervalRef.current = setInterval(tick, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [interval, enabled, onError]);

  const forceRefresh = useCallback(async () => {
    try {
      await savedCallback.current();
    } catch (error) {
      if (onError) {
        onError(error as Error);
      } else {
        console.error("Force refresh error:", error);
      }
    }
  }, [onError]);

  return { forceRefresh };
}

export interface VisibilityPollingOptions extends PollingOptions {
  pauseWhenHidden?: boolean;
}

export function useVisibilityPolling(
  callback: () => Promise<void> | void,
  options: VisibilityPollingOptions = {}
) {
  const { pauseWhenHidden = true, ...pollingOptions } = options;
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!pauseWhenHidden) return;

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pauseWhenHidden]);

  const polling = usePolling(callback, {
    ...pollingOptions,
    enabled: pollingOptions.enabled && isVisible,
  });

  return polling;
}

// For useState in visibility polling
import { useState } from "react";
