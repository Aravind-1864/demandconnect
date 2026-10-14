import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

/** Saved providers (server-side, customers) and the compare tray (local, anyone). */
const CollectionsContext = createContext(null);
const COMPARE_KEY = "dc_compare";
export const MAX_COMPARE = 3;

export function CollectionsProvider({ children }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(() => new Set());
  const [compare, setCompare] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(COMPARE_KEY)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (user?.role !== "CUSTOMER") {
      setSaved(new Set());
      return;
    }
    api.get("/favorites/ids").then((r) => setSaved(new Set(r.data.data))).catch(() => {});
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(COMPARE_KEY, JSON.stringify(compare));
    } catch {
      /* ignore */
    }
  }, [compare]);

  const toggleSaved = useCallback(
    async (id) => {
      const had = saved.has(id);
      setSaved((s) => {
        const n = new Set(s);
        had ? n.delete(id) : n.add(id);
        return n;
      });
      try {
        await (had ? api.delete(`/favorites/${id}`) : api.post(`/favorites/${id}`));
      } catch {
        setSaved((s) => {
          const n = new Set(s);
          had ? n.add(id) : n.delete(id);
          return n;
        });
      }
    },
    [saved]
  );

  const toggleCompare = useCallback(
    (id) =>
      setCompare((list) => {
        if (list.includes(id)) return list.filter((x) => x !== id);
        return list.length >= MAX_COMPARE ? list : [...list, id];
      }),
    []
  );

  const value = useMemo(
    () => ({
      saved,
      toggleSaved,
      compare,
      toggleCompare,
      clearCompare: () => setCompare([]),
      compareFull: compare.length >= MAX_COMPARE,
    }),
    [saved, toggleSaved, compare, toggleCompare]
  );

  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>;
}

export const useCollections = () => {
  const ctx = useContext(CollectionsContext);
  if (!ctx) throw new Error("useCollections must be used inside <CollectionsProvider>");
  return ctx;
};
