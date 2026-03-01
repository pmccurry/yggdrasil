import { useState, useEffect, useRef, useCallback } from 'react';
import type { WidgetConfig, WidgetState } from '../types/widgets';
import { WidgetType } from '../types/widgets';
import { WIDGET_REGISTRY } from '../widgets/registry';
import { emitNotification } from '../utils/notify';

const MIN_POLL_INTERVAL = 5000;
const DEBOUNCE_DELAY = 500;

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour12: false });
}

export function useWidgets(widgets: WidgetConfig[]): Map<string, WidgetState> {
  const [states, setStates] = useState<Map<string, WidgetState>>(new Map());
  const intervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const previousStatesRef = useRef<Map<string, WidgetState>>(new Map());

  const pollWidget = useCallback(async (config: WidgetConfig) => {
    const pollFn = WIDGET_REGISTRY[config.type];
    if (!pollFn) return;

    try {
      const result = await pollFn(config);
      if (!mountedRef.current) return;
      const tooltip = `${config.label} (polled ${formatTime(new Date())})`;
      const newState = { ...result, tooltip };

      // Detect HTTP status changes
      if (config.type === WidgetType.HttpEndpoint) {
        const prev = previousStatesRef.current.get(config.id);
        if (prev && prev.status !== 'loading' && prev.status !== result.status) {
          emitNotification(
            'http.status.change',
            'HTTP Status',
            `${config.label}: ${prev.status} → ${result.status}`,
          );
        }
      }
      previousStatesRef.current.set(config.id, newState);

      setStates(prev => {
        const next = new Map(prev);
        next.set(config.id, newState);
        return next;
      });
    } catch {
      if (!mountedRef.current) return;
      setStates(prev => {
        const next = new Map(prev);
        next.set(config.id, {
          status: 'error',
          value: 'Error',
          tooltip: `${config.label} — poll failed at ${formatTime(new Date())}`,
        });
        return next;
      });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Clear existing intervals
    for (const id of intervalsRef.current.values()) {
      clearInterval(id);
    }
    intervalsRef.current.clear();

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    // Set all widgets to loading
    if (widgets.length > 0) {
      setStates(() => {
        const loading = new Map<string, WidgetState>();
        for (const w of widgets) {
          loading.set(w.id, { status: 'loading', value: '...' });
        }
        return loading;
      });
    } else {
      setStates(new Map());
      return;
    }

    // Debounce before starting polls (500ms delay on workspace switch)
    debounceRef.current = setTimeout(() => {
      if (!mountedRef.current) return;

      for (const config of widgets) {
        // Fire initial poll immediately
        pollWidget(config);

        // Set up interval for subsequent polls
        const interval = Math.max(config.pollInterval, MIN_POLL_INTERVAL);
        if (config.pollInterval > 0) {
          const id = setInterval(() => pollWidget(config), interval);
          intervalsRef.current.set(config.id, id);
        }
      }
    }, DEBOUNCE_DELAY);

    return () => {
      mountedRef.current = false;
      for (const id of intervalsRef.current.values()) {
        clearInterval(id);
      }
      intervalsRef.current.clear();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [widgets, pollWidget]);

  return states;
}
