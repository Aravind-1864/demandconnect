import { useEffect, useRef, useState } from "react";

/** Fades and slides children in the first time they scroll into view. */
export function Reveal({ children, delay = 0, as: Tag = "div", className = "", ...props }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setShown(true);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -20px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`reveal ${shown ? "in" : ""} ${className}`} style={{ "--reveal-delay": `${delay}ms` }} {...props}>
      {children}
    </Tag>
  );
}

/** Counts up to `value` when mounted. */
export function CountUp({ value, duration = 900, format = (n) => Math.round(n).toLocaleString("en-IN") }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !value) return setN(value || 0);
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(n)}</>;
}

/** Circular progress ring that animates from 0 to `value` (0–100). */
export function ScoreRing({ value, size = 72, stroke = 7 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setV(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 85 ? "#059669" : value >= 65 ? "var(--color-brand-600)" : "#d97706";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title="Match score">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-slate-200)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-semibold leading-none text-slate-900">{Math.round(value)}%</span>
        <span className="text-[9px] uppercase tracking-wider text-slate-400">match</span>
      </div>
    </div>
  );
}

/** Pulsing placeholder block. */
export const Skeleton = ({ className = "" }) => <div className={`skeleton rounded-xl ${className}`} />;

export function ProviderCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[4/3] rounded-[1.25rem]" />
      <Skeleton className="mt-4 h-3 w-1/3" />
      <Skeleton className="mt-3 h-8 w-2/3" />
    </div>
  );
}

/** Fires confetti from the top of the screen. Pure canvas, no dependency. */
export function fireConfetti(duration = 2200) {
  if (typeof document === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9999 });
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const colors = ["#bf5232", "#d4b062", "#f4c8b3", "#059669", "#2563eb", "#f59e0b"];
  const pieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.4,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    vx: -2 + Math.random() * 4,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * Math.PI,
    vr: -0.2 + Math.random() * 0.4,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const start = performance.now();
  const frame = (t) => {
    const elapsed = t - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - duration * 0.6) / (duration * 0.4));
    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (elapsed < duration) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

/** Headline whose words slide up from a mask, one after another. */
export function SplitText({ text, className = "", delay = 0, step = 70, as: Tag = "h1" }) {
  return (
    <Tag className={className} aria-label={text}>
      {text.split(" ").map((word, i) => (
        <span key={i} className="word-mask" aria-hidden="true">
          <span style={{ "--w-delay": `${delay + i * step}ms` }}>{word}&nbsp;</span>
        </span>
      ))}
    </Tag>
  );
}

/**
 * Moves its content slower than the scroll for a sense of depth.
 * Layout is measured only on resize; scrolling just does arithmetic and writes
 * one transform, and only while the element is on screen.
 */
export function Parallax({ children, speed = 0.08, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let top = 0;
    let height = 0;
    let visible = true;
    let raf = null;

    const measure = () => {
      const rect = host.getBoundingClientRect();
      top = rect.top + window.scrollY;
      height = rect.height;
    };
    const paint = () => {
      raf = null;
      if (!visible) return;
      const centre = top + height / 2 - (window.scrollY + window.innerHeight / 2);
      el.style.transform = `translate3d(0, ${(-centre * speed).toFixed(1)}px, 0)`;
    };
    const schedule = () => {
      if (raf === null) raf = requestAnimationFrame(paint);
    };
    const onResize = () => {
      measure();
      schedule();
    };

    measure();
    paint();
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
    });
    io.observe(host);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("load", onResize);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onResize);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [speed]);

  // The wrapper is oversized so the shift never reveals an empty edge.
  return (
    <div ref={ref} className={`absolute -inset-y-[8%] inset-x-0 will-change-transform ${className}`}>
      {children}
    </div>
  );
}

/** Endless horizontal ticker. */
export function Marquee({ items, className = "" }) {
  const row = (key) => (
    <div key={key} className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={key === "b"}>
      {items.map((t, i) => (
        <span key={i} className="flex items-center gap-10">
          <span>{t}</span>
          <span className="h-2 w-2 rounded-full bg-current opacity-40" />
        </span>
      ))}
    </div>
  );
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="marquee-track flex w-max animate-marquee">{[row("a"), row("b")]}</div>
    </div>
  );
}
