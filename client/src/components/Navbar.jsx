import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "../context/AuthContext";
import { useRealtime } from "../context/RealtimeContext";
import { NotificationBell } from "./widgets";

/** Wordmark. The light variant is for use over photos and dark surfaces. */
export function Logo({ className = "", light = false }) {
  return (
    <span className={`inline-flex items-center gap-2 font-sans text-[17px] font-bold tracking-tight ${light ? "text-white" : "text-slate-900"} ${className}`}>
      <img src="/favicon.svg" alt="" className="h-7 w-7 rounded-md" />
      <span>DemandConnect</span>
    </span>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { msgUnread } = useRealtime();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const onPhotoHero = /^\/providers\/[^/]+$/.test(pathname) && pathname !== "/providers/batch";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navLinks = [
    { to: "/providers", label: "Explore Providers" },
    ...(user?.role === "CUSTOMER"
      ? [
          { to: "/choose-mode", label: "Plan Event" },
          { to: "/customer/saved", label: "Saved" },
        ]
      : []),
    ...(user && user.role !== "ADMIN"
      ? [{ to: "/messages", label: "Messages", badge: msgUnread }]
      : []),
    ...(user ? [{ to: homeFor(user.role), label: "Dashboard" }] : []),
  ];

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b ${
        onPhotoHero ? "border-white/10 bg-slate-900/80 text-white backdrop-blur" : "border-slate-200 bg-white/95 text-slate-800 backdrop-blur"
      }`}
    >
      <div className="mx-auto grid h-16 max-w-[1240px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6">
        <div className="flex items-center">
          <Link to="/" aria-label="DemandConnect home" className="flex items-center shrink-0">
            <Logo light={onPhotoHero} />
          </Link>
        </div>

          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `relative text-[15px] tracking-normal transition-colors ${
                    isActive
                      ? onPhotoHero ? "text-white font-medium" : "text-slate-900 font-medium"
                      : onPhotoHero ? "text-slate-300 hover:text-white" : "text-slate-500 hover:text-slate-900"
                  }`
                }
              >
                {link.label}
                {link.badge > 0 && (
                  <span className="ml-1 rounded bg-brand-600 px-1 text-[10px] font-semibold text-white">{link.badge}</span>
                )}
              </NavLink>
            ))}
          </nav>

        <div className="col-start-3 flex items-center justify-end gap-4">
          {user && (
            <div className="hidden sm:flex items-center">
              <NotificationBell />
            </div>
          )}

          {user ? (
            <button
              onClick={handleLogout}
              className={`hidden sm:inline-flex h-8 items-center rounded-md border px-3 text-sm transition ${
                onPhotoHero ? "border-white/20 hover:bg-white/10" : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Sign out
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-6">
              <Link
                to="/login"
                className={`text-[15px] font-medium tracking-normal transition-colors ${onPhotoHero ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="inline-flex h-9 items-center rounded-lg bg-brand-600 px-4 text-[15px] font-medium tracking-normal text-white transition hover:bg-brand-700"
              >
                Get started
              </Link>
            </div>
          )}

          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className={`md:hidden flex h-8 w-8 items-center justify-center rounded-md border ${
              onPhotoHero ? "border-white/20 text-white" : "border-slate-200 text-slate-700"
            }`}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileOpen && (
        <div className="md:hidden mx-4 my-1 p-4 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-2 animate-fade-in text-slate-900">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive ? "bg-brand-50 text-brand-600" : "text-slate-700 hover:bg-slate-50"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl"
              >
                Log out
              </button>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center py-2 text-sm font-bold text-white bg-brand-600 rounded-xl"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
