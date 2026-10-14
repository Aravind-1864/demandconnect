import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import api, { TOKEN_KEY } from "../services/api";
import { useAuth } from "./AuthContext";

const RealtimeContext = createContext(null);

const socketOrigin = () => {
  const api = import.meta.env.VITE_API_URL;
  try {
    return api ? new URL(api).origin : window.location.origin;
  } catch {
    return window.location.origin;
  }
};

/**
 * One socket per logged-in session. Provides live notifications, the unread
 * chat counter and short toasts for incoming events.
 */
export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [msgUnread, setMsgUnread] = useState(0);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const pushToast = useCallback((t) => {
    const id = ++toastId.current;
    setToasts((list) => [...list.slice(-2), { id, ...t }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 5000);
  }, []);

  const refreshMessages = useCallback(async () => {
    try {
      if (user && user.role !== "ADMIN") {
        const res = await api.get("/messages/unread-count");
        setMsgUnread(res.data.data.count);
      }
    } catch {
      /* non-critical */
    }
  }, [user]);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data.data);
      setUnread(res.data.unread);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnread(0);
      setMsgUnread(0);
      setSocket(null);
      return;
    }
    refreshNotifications();
    refreshMessages();

    const s = io(socketOrigin(), { auth: { token: localStorage.getItem(TOKEN_KEY) }, transports: ["websocket", "polling"] });
    s.on("notification", (n) => {
      setNotifications((list) => [n, ...list].slice(0, 30));
      setUnread((c) => c + 1);
      pushToast({ title: n.title, body: n.body, link: n.link });
    });
    s.on("new_request", (reqData) => {
      if (user?.role === "PROVIDER") {
        pushToast({
          title: `⚡ Live Request: ${reqData.title}`,
          body: `Looking for ${reqData.serviceNames || "services"} in ${reqData.location}!`,
          link: "/provider/requests",
        });
      }
    });
    s.on("message", (m) => {
      if (String(m.recipient) === String(user._id)) {
        refreshMessages();
        // The chat page shows its own live updates; toast only elsewhere.
        if (!window.location.pathname.startsWith("/messages")) {
          pushToast({ title: "New message", body: m.text.slice(0, 80), link: `/messages/${m.sender}` });
        }
      }
    });
    setSocket(s);

    // Safety net when the socket is blocked by a proxy.
    const poll = setInterval(refreshNotifications, 60000);
    return () => {
      clearInterval(poll);
      s.disconnect();
    };
  }, [user, refreshNotifications, refreshMessages, pushToast]);

  const markRead = async (id) => {
    setNotifications((list) => list.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      refreshNotifications();
    }
  };

  const markAllRead = async () => {
    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await api.patch("/notifications/read-all");
    } catch {
      refreshNotifications();
    }
  };

  const value = useMemo(
    () => ({ socket, notifications, unread, msgUnread, markRead, markAllRead, refreshMessages }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [socket, notifications, unread, msgUnread, refreshMessages]
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onClose={(id) => setToasts((l) => l.filter((t) => t.id !== id))} />
    </RealtimeContext.Provider>
  );
}

function ToastStack({ toasts, onClose }) {
  const navigate = useNavigate();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto animate-fade-up rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
          role="status"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                if (t.link) navigate(t.link);
                onClose(t.id);
              }}
            >
              <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              {t.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{t.body}</p>}
            </button>
            <button aria-label="Dismiss" onClick={() => onClose(t.id)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export const useRealtime = () => {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used inside <RealtimeProvider>");
  return ctx;
};
