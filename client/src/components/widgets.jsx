import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCollections, MAX_COMPARE } from "../context/CollectionsContext";
import { useRealtime } from "../context/RealtimeContext";
import { formatDate } from "../utils/format";

// ---- Save (heart) --------------------------------------------------------------
export function HeartButton({ providerId, className = "" }) {
  const { user } = useAuth();
  const { saved, toggleSaved } = useCollections();
  const navigate = useNavigate();
  const [pop, setPop] = useState(false);
  if (user && user.role !== "CUSTOMER") return null;

  const on = saved.has(providerId);
  const click = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return navigate("/login", { state: { from: window.location.pathname } });
    setPop(true);
    setTimeout(() => setPop(false), 450);
    toggleSaved(providerId);
  };

  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={on}
      aria-label={on ? "Remove from saved" : "Save provider"}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50 ${className}`}
    >
      <span className={`text-lg leading-none ${on ? "text-red-500" : "text-slate-400"} ${pop ? "heart-pop" : ""}`}>{on ? "♥" : "♡"}</span>
    </button>
  );
}

// ---- Compare ---------------------------------------------------------------------
export function CompareToggle({ providerId }) {
  const { compare, toggleCompare, compareFull } = useCollections();
  const on = compare.includes(providerId);
  const disabled = !on && compareFull;
  return (
    <label
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium shadow-sm hover:bg-slate-50 ${
        disabled ? "cursor-not-allowed text-slate-300" : "cursor-pointer text-slate-700"
      }`}
      title={disabled ? `You can compare up to ${MAX_COMPARE} providers` : "Add to compare"}
    >
      <input
        type="checkbox"
        className="h-4 w-4 rounded accent-[var(--color-brand-600)]"
        checked={on}
        disabled={disabled}
        onChange={() => toggleCompare(providerId)}
      />
      Compare
    </label>
  );
}

export function CompareBar() {
  const { compare, clearCompare } = useCollections();
  if (compare.length === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex animate-fade-up items-center gap-4 rounded-full border border-slate-200 bg-white py-2 pl-5 pr-2 shadow-2xl">
        <span className="text-sm font-semibold text-slate-700">
          {compare.length} selected <span className="font-normal text-slate-400">of {MAX_COMPARE}</span>
        </span>
        <button onClick={clearCompare} className="text-sm text-slate-500 hover:text-slate-800">Clear</button>
        <Link
          to={`/compare?ids=${compare.join(",")}`}
          className={`rounded-full px-5 py-2 text-sm font-semibold text-white ${compare.length < 2 ? "pointer-events-none bg-slate-300" : "bg-brand-600 hover:bg-brand-700"}`}
        >
          Compare
        </Link>
      </div>
    </div>
  );
}

// ---- Notification bell -----------------------------------------------------------
export function NotificationBell() {
  const { notifications, unread, markRead, markAllRead } = useRealtime();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-lg text-slate-600 hover:bg-slate-100"
      >
        🔔
        {unread > 0 && (
          <span key={unread} className="absolute right-1 top-1 flex h-4 min-w-4 animate-pop items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 animate-slide-down overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="font-display text-base font-semibold text-slate-900">Notifications</span>
            {unread > 0 && <button onClick={markAllRead} className="text-xs font-semibold text-brand-600">Mark all read</button>}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && <li className="px-4 py-10 text-center text-sm text-slate-400">You're all caught up.</li>}
            {notifications.map((n) => (
              <li key={n._id}>
                <button
                  className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 ${n.read ? "" : "bg-brand-50/50"}`}
                  onClick={() => {
                    if (!n.read) markRead(n._id);
                    setOpen(false);
                    if (n.link) navigate(n.link);
                  }}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-brand-600"}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{n.title}</span>
                    {n.body && <span className="block truncate text-xs text-slate-500">{n.body}</span>}
                    <span className="block text-[11px] text-slate-400">{formatDate(n.createdAt, { day: "numeric", month: "short" })}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
