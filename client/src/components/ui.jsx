import { useEffect } from "react";
import { STATUS_TONE, statusLabel } from "../utils/format";

const cx = (...parts) => parts.filter(Boolean).join(" ");

// ---- Buttons ----------------------------------------------------------------
const BUTTON_VARIANTS = {
  primary: "bg-ink hover:opacity-85",
  secondary: "bg-white/70 text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-white",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  ghost: "text-slate-600 hover:bg-slate-100",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
};
const BUTTON_SIZES = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3 text-base" };

export function Button({ variant = "primary", size = "md", loading = false, className, children, disabled, ...props }) {
  return (
    <button
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-60",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

// ---- Layout primitives --------------------------------------------------------
export function Card({ className, children, ...props }) {
  return (
    <div className={cx("rounded-2xl border border-slate-200 bg-white shadow-sm", className)} {...props}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-4xl font-medium tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// ---- Feedback -----------------------------------------------------------------
export function Spinner({ className = "h-5 w-5" }) {
  return (
    <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-90" />
    </svg>
  );
}

export function PageLoader({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-slate-500" role="status">
      <Spinner className="h-6 w-6 text-brand-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

const ALERT_TONES = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

export function Alert({ tone = "error", children, className }) {
  if (!children) return null;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-lg border px-4 py-3 text-sm", ALERT_TONES[tone], className)}>
      {children}
    </div>
  );
}

export function EmptyState({ title, description, action, icon = "✦" }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-xl text-brand-600">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---- Badges & ratings -----------------------------------------------------------
const BADGE_TONES = {
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  violet: "bg-violet-50 text-violet-700",
  brand: "bg-brand-50 text-brand-700",
};

export function Badge({ tone = "slate", children, className }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", BADGE_TONES[tone], className)}>
      {children}
    </span>
  );
}

export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status] || "slate"}>{statusLabel(status)}</Badge>;

export function Stars({ value = 0, count, size = "text-sm" }) {
  if (!count) return <span className="text-xs text-slate-400">No reviews yet</span>;
  return (
    <span className={cx("inline-flex items-center gap-1", size)}>
      <span className="text-amber-500">★</span>
      <span className="font-semibold text-slate-800">{value.toFixed(1)}</span>
      <span className="text-slate-400">({count})</span>
    </span>
  );
}

// ---- Forms ----------------------------------------------------------------------
export const inputClass =
  "block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 " +
  "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50";

export function Field({ label, hint, error, required, children, className }) {
  return (
    <label className={cx("block", className)}>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export const Input = ({ className, ...props }) => <input className={cx(inputClass, className)} {...props} />;
export const Textarea = ({ className, ...props }) => <textarea rows={4} className={cx(inputClass, className)} {...props} />;
export const Select = ({ className, children, ...props }) => (
  <select className={cx(inputClass, className)} {...props}>
    {children}
  </select>
);

/** Free-text tag input: Enter or comma adds, × removes. */
export function ChipInput({ value = [], onChange, placeholder = "Type and press Enter", max = 30 }) {
  const add = (raw) => {
    const items = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && !value.some((v) => v.toLowerCase() === s.toLowerCase()));
    if (items.length) onChange([...value, ...items].slice(0, max));
  };
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
      <div className="flex flex-wrap gap-1.5">
        {value.map((item) => (
          <span key={item} className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
            {item}
            <button type="button" aria-label={`Remove ${item}`} onClick={() => onChange(value.filter((v) => v !== item))} className="text-brand-500 hover:text-brand-900">
              ×
            </button>
          </span>
        ))}
        <input
          className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm focus:outline-none"
          placeholder={value.length ? "" : placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(e.currentTarget.value);
              e.currentTarget.value = "";
            } else if (e.key === "Backspace" && !e.currentTarget.value && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={(e) => {
            add(e.currentTarget.value);
            e.currentTarget.value = "";
          }}
        />
      </div>
    </div>
  );
}

// ---- Modal ----------------------------------------------------------------------
export function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-stone-900/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
