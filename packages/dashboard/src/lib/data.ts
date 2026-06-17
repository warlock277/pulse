import { useCallback, useEffect, useRef, useState } from "react";
import type { Summary, SiteHistory, Incident, Permissions } from "@pulse/shared";

/** Base URL for the JSON data files (dev middleware / static in prod). */
export const DATA_BASE: string = import.meta.env.VITE_DATA_BASE ?? "/data";

/** Polling interval in ms (0 disables refresh). */
export const REFRESH_MS: number = (() => {
  const raw = import.meta.env.VITE_REFRESH_MS;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : 60_000;
})();

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Fetch + parse a JSON resource, throwing a typed error on non-2xx. */
export async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${DATA_BASE}/${path}`, {
    signal,
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new HttpError(`Failed to load ${path} (${res.status})`, res.status);
  }
  return (await res.json()) as T;
}

export interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  /** True only on the very first load (no data yet). */
  loading: boolean;
  /** True while a background refresh is in flight (data already present). */
  refreshing: boolean;
  /** Force an immediate re-fetch. */
  reload: () => void;
}

interface ResourceOptions {
  /** Refresh interval (ms). Defaults to REFRESH_MS. 0 disables. */
  refreshMs?: number;
  /** When false, the resource is not fetched (returns idle state). */
  enabled?: boolean;
}

/**
 * Generic polling resource hook. Minimal by design — no external data lib.
 * Keeps the last good data across refreshes and only surfaces hard errors.
 */
export function useResource<T>(
  path: string | null,
  options: ResourceOptions = {},
): AsyncState<T> {
  const { refreshMs = REFRESH_MS, enabled = true } = options;
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState<boolean>(enabled && path != null);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const mounted = useRef(true);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || path == null) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let interval: ReturnType<typeof setInterval> | undefined;

    const run = async (background: boolean) => {
      if (background) setRefreshing(true);
      try {
        const json = await fetchJson<T>(path, controller.signal);
        if (!mounted.current) return;
        setData(json);
        setError(undefined);
      } catch (err) {
        if (controller.signal.aborted || !mounted.current) return;
        // Keep stale data on a background failure; only surface on first load.
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    setLoading((prev) => (data === undefined ? true : prev));
    void run(data !== undefined);

    if (refreshMs > 0) {
      interval = setInterval(() => void run(true), refreshMs);
    }

    return () => {
      controller.abort();
      if (interval) clearInterval(interval);
    };
    // `tick` forces a manual reload; `data` is intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, refreshMs, enabled, tick]);

  return { data, error, loading, refreshing, reload };
}

// ---------------------------------------------------------------------------
// Typed convenience hooks
// ---------------------------------------------------------------------------

export function useSummary(): AsyncState<Summary> {
  return useResource<Summary>("summary.json");
}

export function useHistory(id: string | undefined): AsyncState<SiteHistory> {
  return useResource<SiteHistory>(id ? `history/${id}.json` : null, {
    enabled: !!id,
  });
}

export function useIncidents(): AsyncState<Incident[]> {
  return useResource<Incident[]>("incidents.json");
}

/** Permissions are optional — fetched once, no polling, 404 tolerated. */
export async function fetchPermissions(): Promise<Permissions | null> {
  try {
    return await fetchJson<Permissions>("permissions.json");
  } catch {
    return null;
  }
}
