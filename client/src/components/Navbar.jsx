import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "../context/AuthContext";
import { Button } from "./ui";

const linkClass = ({ isActive }) =>
  `px-3 py-2 text-sm font-semibold transition ${
    isActive ? "text-brand-700" : "text-slate-600 hover:text-slate-900"
  }`;

export function Logo({ className = "", light = false }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight ${light ? "text-white" : "text-slate-900"} ${className}`}>
      <img src="/favicon.svg" alt="" className="h-7 w-7" />
      Demand<span className={light ? "text-brand-200" : "text-brand-600"}>Connect</span>
    </span>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const links = (
    <>
      <NavLink to="/providers" className={linkClass} onClick={() => setOpen(false)}>
        Find providers
      </NavLink>
      {user?.role === "CUSTOMER" && (
        <NavLink to="/choose-mode" className={linkClass} onClick={() => setOpen(false)}>
          Plan an event
        </NavLink>
      )}
      {user && (
        <NavLink to={homeFor(user.role)} className={linkClass} onClick={() => setOpen(false)}>
          Dashboard
        </NavLink>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="DemandConnect home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-4 md:flex">{links}</nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="text-sm text-slate-500">
                {user.name} <span className="text-xs uppercase tracking-wide text-slate-400">· {user.role.toLowerCase()}</span>
              </span>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
                Log in
              </Link>
              <Link to="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="rounded-full p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <div className="space-y-1 border-t border-slate-200 bg-slate-50 px-4 py-3 md:hidden">
          <div className="flex flex-col">{links}</div>
          <div className="mt-3 flex gap-2 border-t border-slate-200 pt-3">
            {user ? (
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)}>
                  <Button variant="secondary" size="sm">Log in</Button>
                </Link>
                <Link to="/register" onClick={() => setOpen(false)}>
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
