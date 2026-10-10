import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { TOKEN_KEY, unwrap } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY));

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setHasProfile(false);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = unwrap(await api.get("/auth/me"));
      setUser(data.user);
      setHasProfile(data.hasProfile);
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    if (localStorage.getItem(TOKEN_KEY)) refresh();
  }, [refresh]);

  useEffect(() => {
    window.addEventListener("dc:unauthorized", clearSession);
    return () => window.removeEventListener("dc:unauthorized", clearSession);
  }, [clearSession]);

  const authenticate = async (path, payload) => {
    const { user: u, token } = unwrap(await api.post(path, payload));
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
    setHasProfile(false);
    if (u.role === "PROVIDER") refresh();
    return u;
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      hasProfile,
      isAuthenticated: !!user,
      login: (email, password) => authenticate("/auth/login", { email, password }),
      register: (payload) => authenticate("/auth/register", payload),
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } catch {
          /* token is discarded regardless */
        }
        clearSession();
      },
      refresh,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading, hasProfile, refresh, clearSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export const homeFor = (role) =>
  ({ CUSTOMER: "/customer", PROVIDER: "/provider", ADMIN: "/admin" })[role] || "/";
