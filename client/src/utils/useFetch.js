import { useCallback, useEffect, useRef, useState } from "react";
import api, { errorMessage } from "../services/api";

/**
 * GET helper with loading / error / reload state.
 * Stale responses from earlier requests are ignored.
 *   const { data, loading, error, meta, reload } = useFetch("/requests/mine");
 * Pass `null` as the url to skip fetching.
 */
export default function useFetch(url, params) {
  const [state, setState] = useState({ data: null, meta: null, loading: !!url, error: "" });
  const counter = useRef(0);
  const key = JSON.stringify(params || {});

  const run = useCallback(async () => {
    if (!url) return;
    const id = ++counter.current;
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const res = await api.get(url, { params: JSON.parse(key) });
      if (id === counter.current) {
        setState({ data: res.data.data, meta: res.data.pagination || null, loading: false, error: "" });
      }
    } catch (err) {
      if (id === counter.current) setState({ data: null, meta: null, loading: false, error: errorMessage(err) });
    }
  }, [url, key]);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, reload: run };
}
