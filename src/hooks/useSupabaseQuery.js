import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Runs an async fetcher (typically a Supabase query) and exposes standard
 * loading / error / data / refetch state. `deps` re-triggers the fetch.
 *
 * fetcher: async () => { data, error }  (Supabase's shape)
 */
export function useSupabaseQuery(fetcher, deps = [], { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (result?.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result?.data ?? null);
      }
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  return { data, error, loading, refetch: run };
}
