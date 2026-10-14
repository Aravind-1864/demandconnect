import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Link } from "react-router-dom";
import api, { errorMessage, unwrap } from "../services/api";
import { formatINR } from "../utils/format";
import { Spinner } from "./ui";

// ---- Image uploader ---------------------------------------------------------------
/** Drag-and-drop image upload. `value` is a URL string (single) or array of URLs (multiple). */
export function ImageUploader({ value, onChange, multiple = false, max = 8, label = "Drop an image here or click to browse" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef(null);
  const urls = multiple ? value || [] : value ? [value] : [];

  const upload = async (files) => {
    setError("");
    const list = [...files].filter((f) => f.type.startsWith("image/")).slice(0, multiple ? max - urls.length : 1);
    if (!list.length) return setError("Please choose image files (JPG, PNG, WebP or GIF).");
    setBusy(true);
    try {
      const added = [];
      for (const file of list) {
        if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} is larger than 5 MB`);
        const body = new FormData();
        body.append("file", file);
        added.push(unwrap(await api.post("/uploads", body)).url);
      }
      onChange(multiple ? [...urls, ...added] : added[0]);
    } catch (err) {
      setError(err.response ? errorMessage(err) : err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = (u) => onChange(multiple ? urls.filter((x) => x !== u) : "");

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          upload(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
          over ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-slate-50 hover:border-brand-200"
        }`}
      >
        {busy ? <Spinner className="h-6 w-6 text-brand-600" /> : <span className="text-2xl">📷</span>}
        <p className="mt-2 text-sm font-medium text-slate-700">{busy ? "Uploading…" : label}</p>
        <p className="text-xs text-slate-400">JPG, PNG, WebP or GIF · up to 5 MB</p>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple={multiple}
          hidden
          onChange={(e) => {
            upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {urls.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {urls.map((u) => (
            <div key={u} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-200">
              <img src={u} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => remove(u)}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Map ------------------------------------------------------------------------------
const CITY_COORDS = {
  hyderabad: [17.385, 78.4867], secunderabad: [17.4399, 78.4983], warangal: [17.9689, 79.5941],
  vijayawada: [16.5062, 80.648], visakhapatnam: [17.6868, 83.2185], bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946], mysuru: [12.2958, 76.6394], chennai: [13.0827, 80.2707],
  mumbai: [19.076, 72.8777], pune: [18.5204, 73.8567], delhi: [28.6139, 77.209], kolkata: [22.5726, 88.3639],
  ahmedabad: [23.0225, 72.5714], jaipur: [26.9124, 75.7873], kochi: [9.9312, 76.2673], goa: [15.2993, 74.124],
};

export const cityCoords = (name) => CITY_COORDS[String(name || "").toLowerCase().trim()];

/** Leaflet map: one pin per city, popup lists the providers there. */
export function MapView({ providers }) {
  const el = useRef(null);
  const mapRef = useRef(null);
  const layer = useRef(null);

  useEffect(() => {
    if (!el.current || mapRef.current) return;
    mapRef.current = L.map(el.current, { scrollWheelZoom: false }).setView([17.4, 78.5], 6);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap contributors © CARTO",
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(mapRef.current);
    layer.current = L.layerGroup().addTo(mapRef.current);
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!layer.current) return;
    layer.current.clearLayers();
    const byCity = new Map();
    for (const p of providers) {
      const key = String(p.location).toLowerCase().trim();
      if (!cityCoords(key)) continue;
      if (!byCity.has(key)) byCity.set(key, []);
      byCity.get(key).push(p);
    }
    const bounds = [];
    for (const [city, list] of byCity) {
      const pos = cityCoords(city);
      bounds.push(pos);
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:#bf5232;color:#fff;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.3);width:38px;height:38px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-weight:700;font-size:14px">${list.length}</span></div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
      });
      const html = `<strong style="text-transform:capitalize">${city}</strong><br/>${list
        .slice(0, 6)
        .map((p) => `<a href="/providers/${p._id}" style="color:#bf5232;font-weight:600">${p.businessName.replace(/</g, "&lt;")}</a> · ${p.startingPrice ? "₹" + p.startingPrice.toLocaleString("en-IN") : "on request"}`)
        .join("<br/>")}`;
      L.marker(pos, { icon }).bindPopup(html).addTo(layer.current);
    }
    if (bounds.length) mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
  }, [providers]);

  return <div ref={el} className="h-[520px] w-full overflow-hidden rounded-2xl border border-slate-200" />;
}

// ---- Charts ---------------------------------------------------------------------------
/** Minimal animated SVG bar chart. */
export function BarChart({ data, height = 180, format = (v) => v, color = "var(--color-brand-600)" }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
      {data.map((d) => (
        <div key={d.label + (d.key || "")} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
          <span className="text-[11px] font-semibold text-slate-500 opacity-0 transition group-hover:opacity-100">{format(d.value)}</span>
          <div className="relative flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-lg transition-all duration-1000 ease-out"
              style={{
                height: ready ? `${Math.max(d.value ? 4 : 1, (d.value / max) * 100)}%` : "0%",
                background: d.value ? color : "var(--color-slate-200)",
              }}
            />
          </div>
          <span className="truncate text-[11px] text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Meter({ label, value, max, hint }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{hint ?? formatINR(value)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-600 transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---- Month calendar -----------------------------------------------------------------
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const iso = (d) => new Date(d).toISOString().slice(0, 10);

export function MonthCalendar({ bookings = [], blockedDates = [], workingDays = [0, 1, 2, 3, 4, 5, 6] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  });
  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = [...Array(first.getUTCDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  const bookingByDay = new Map(bookings.map((b) => [iso(b.eventDate), b]));
  const blocked = new Set(blockedDates.map(iso));
  const todayKey = iso(new Date());

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold text-slate-900">
          {cursor.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
        </h3>
        <div className="flex gap-1">
          <button className="rounded-full px-3 py-1.5 text-slate-600 hover:bg-slate-100" onClick={() => setCursor(new Date(Date.UTC(year, month - 1, 1)))} aria-label="Previous month">←</button>
          <button className="rounded-full px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100" onClick={() => { const d = new Date(); setCursor(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))); }}>Today</button>
          <button className="rounded-full px-3 py-1.5 text-slate-600 hover:bg-slate-100" onClick={() => setCursor(new Date(Date.UTC(year, month + 1, 1)))} aria-label="Next month">→</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
        {WEEK.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const key = iso(Date.UTC(year, month, day));
          const booking = bookingByDay.get(key);
          const isBlocked = blocked.has(key);
          const off = !workingDays.includes(new Date(Date.UTC(year, month, day)).getUTCDay());
          return (
            <div
              key={key}
              title={booking ? `${booking.request?.title || "Booking"} · ${formatINR(booking.agreedPrice)}` : isBlocked ? "Blocked" : off ? "Day off" : ""}
              className={`flex aspect-square flex-col rounded-xl border p-1.5 text-left text-xs sm:p-2 ${
                booking
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : isBlocked
                  ? "border-red-200 bg-red-50 text-red-700"
                  : off
                  ? "border-transparent bg-slate-100 text-slate-400"
                  : "border-slate-200 bg-white text-slate-700"
              } ${key === todayKey ? "ring-2 ring-brand-600" : ""}`}
            >
              <span className="font-semibold">{day}</span>
              {booking && <span className="mt-auto hidden truncate text-[10px] font-medium sm:block">{booking.request?.title || "Booked"}</span>}
              {isBlocked && !booking && <span className="mt-auto hidden text-[10px] sm:block">Blocked</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-brand-100 ring-1 ring-brand-200" /> Booked</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-red-50 ring-1 ring-red-200" /> Blocked</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-slate-100" /> Day off</span>
      </div>
    </div>
  );
}

export const LinkButton = ({ to, children }) => (
  <Link to={to} className="inline-flex items-center rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
    {children}
  </Link>
);
